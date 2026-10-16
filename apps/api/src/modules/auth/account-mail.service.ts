import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { createTransport } from 'nodemailer';
import { AccountSecurityRepository } from './account-security.repository';
import { AccountPurpose, secretToken, tokenHash } from './account-security';

@Injectable()
export class SmtpAccountTransport {
  constructor(private readonly config: ConfigService) {}
  async send(to: string, subject: string, text: string) {
    const port = this.config.get<number>('email.port') || 587;
    const transport = createTransport({
      host: this.config.get<string>('email.host'),
      port,
      secure: port === 465,
      requireTLS: true,
      auth: {
        user: this.config.get<string>('email.user') || '',
        pass: this.config.get<string>('email.pass') || '',
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
      disableFileAccess: true,
      disableUrlAccess: true,
      logger: false,
      debug: false,
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        transport.sendMail({
          from: this.config.get<string>('email.from'),
          to,
          subject,
          text,
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Mail deadline')), 10000);
        }),
      ]);
      if (!result.accepted.includes(to))
        throw new Error('Recipient not accepted');
    } catch {
      throw new ServiceUnavailableException('Email transport unavailable');
    } finally {
      if (timer) clearTimeout(timer);
      transport.close();
    }
  }
}

@Injectable()
export class AccountMailService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(AccountMailService.name);
  constructor(
    private readonly repo: AccountSecurityRepository,
    private readonly config: ConfigService,
    private readonly transport: SmtpAccountTransport,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.deliverPending(), 15000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  configured() {
    return (
      /^[a-fA-F0-9]{64}$/.test(
        this.config.get<string>('email.tokenKey') || '',
      ) &&
      ['email.host', 'email.user', 'email.pass', 'email.from'].every((key) =>
        Boolean(this.config.get<string>(key)),
      )
    );
  }
  private key() {
    const value = this.config.get<string>('email.tokenKey') || '';
    if (!/^[a-fA-F0-9]{64}$/.test(value))
      throw new ServiceUnavailableException(
        'Email encryption key is not configured',
      );
    return Buffer.from(value, 'hex');
  }
  seal(raw: string, aad: string) {
    const iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    cipher.setAAD(Buffer.from(aad));
    const encrypted = Buffer.concat([
      cipher.update(raw, 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
      'base64',
    );
  }
  private open(value: string, aad: string) {
    const bytes = Buffer.from(value, 'base64');
    const cipher = createDecipheriv(
      'aes-256-gcm',
      this.key(),
      bytes.subarray(0, 12),
    );
    cipher.setAuthTag(bytes.subarray(12, 28));
    cipher.setAAD(Buffer.from(aad));
    return Buffer.concat([
      cipher.update(bytes.subarray(28)),
      cipher.final(),
    ]).toString('utf8');
  }
  async enqueue(userId: string, purpose: AccountPurpose) {
    if (!this.configured()) return { delivery: 'UNAVAILABLE' as const };
    const raw = secretToken(purpose === 'VERIFY' ? 'verify' : 'reset'),
      hash = tokenHash(raw);
    const ciphertext = this.seal(raw, purpose + ':' + userId + ':' + hash);
    const created = await this.repo.issueAction(
      userId,
      purpose,
      hash,
      ciphertext,
      new Date(Date.now() + (purpose === 'VERIFY' ? 24 : 1) * 3600000),
    );
    return { delivery: created ? ('QUEUED' as const) : ('UNCHANGED' as const) };
  }
  async deliverPending() {
    if (this.running || !this.configured()) return;
    this.running = true;
    try {
      for (let i = 0; i < 5; i++) {
        const mail = await this.repo.claimMail();
        if (!mail) break;
        try {
          if (
            !['VERIFY', 'RESET'].includes(mail.purpose) ||
            mail.expiresAt <= new Date()
          ) {
            await this.repo.finishMail(mail.id, 'CANCELLED');
            continue;
          }
          const purpose = mail.purpose as AccountPurpose;
          const recipient = await this.repo.mailRecipient(
            mail.userId,
            mail.tokenHash,
            purpose,
          );
          if (!recipient) {
            await this.repo.finishMail(mail.id, 'CANCELLED');
            continue;
          }
          const raw = this.open(
            mail.encryptedToken,
            purpose + ':' + mail.userId + ':' + mail.tokenHash,
          );
          if (tokenHash(raw) !== mail.tokenHash)
            throw new Error('Invalid mail token');
          const url = new URL(
            purpose === 'VERIFY' ? '/verify-email' : '/reset-password',
            this.config.get<string>('frontendUrl'),
          );
          url.hash = new URLSearchParams({ token: raw }).toString();
          await this.transport.send(
            recipient,
            purpose === 'VERIFY'
              ? 'Verify your Nexora email'
              : 'Reset your Nexora password',
            (purpose === 'VERIFY'
              ? 'Confirm your email address'
              : 'Choose a new password') +
              ' using this single-use link:\n\n' +
              url.href +
              '\n\nThis link expires ' +
              (purpose === 'VERIFY' ? 'in 24 hours.' : 'in one hour.') +
              '\nIf you did not request this, you can ignore this email.',
          );
          await this.repo.finishMail(mail.id, 'SENT');
        } catch {
          await this.repo.retryMail(mail.id, mail.attempts + 1);
          this.logger.warn(
            'Account email deferred; inspect private mail queue status',
          );
        }
      }
    } catch {
      this.logger.error(
        'Account mail worker unavailable; durable records retained',
      );
    } finally {
      this.running = false;
    }
  }
}
