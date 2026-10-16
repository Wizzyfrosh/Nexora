import { createHash, randomBytes } from 'node:crypto';
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
