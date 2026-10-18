import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';
export const verificationCode = () =>
  randomInt(0, 1000000).toString().padStart(6, '0');
export function verificationHash(userId: string, code: string, key: Buffer) {
  return (
    'otp:' +
    createHmac('sha256', key)
      .update('VERIFY:' + userId + ':' + code)
      .digest('hex')
  );
}
export type AccountPurpose = 'VERIFY' | 'RESET';
export function secretToken(prefix: 'rt' | 'verify' | 'reset') {
  return prefix + '_' + randomBytes(32).toString('base64url');
}
export function tokenHash(token: string) {
  return 'sha256:' + createHash('sha256').update(token).digest('hex');
}
export function validToken(
  value: unknown,
  prefix: 'rt' | 'verify' | 'reset',
): value is string {
  return (
    typeof value === 'string' &&
    new RegExp('^' + prefix + '_[A-Za-z0-9_-]{43}$').test(value)
  );
}
