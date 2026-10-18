import { verificationCode, verificationHash } from './account-security';
import { verificationEmail } from './verification-email';

describe('Verification codes and email', () => {
  it('uses six digits and binds digests to account and secret', () => {
    expect(verificationCode()).toMatch(/^[0-9]{6}$/);
    const hash = verificationHash('owner', '012345', Buffer.alloc(32, 1));
    expect(hash).not.toContain('012345');
    expect(hash).not.toBe(
      verificationHash('other', '012345', Buffer.alloc(32, 1)),
    );
    expect(hash).not.toBe(
      verificationHash('owner', '012345', Buffer.alloc(32, 2)),
    );
  });
  it('renders matching HTML/text codes with expiry and no verification link', () => {
    const email = verificationEmail('012345');
    expect(email.html).toContain('012345');
    expect(email.text).toContain('Your verification code: 012345');
    expect(email.text).toContain('10 minutes');
    expect(email.html).not.toContain('href=');
    expect(() => verificationEmail('<img>')).toThrow();
  });
});
