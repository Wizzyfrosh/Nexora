import { OriginGuard } from './origin.guard';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
const guard = new OriginGuard({
  get: () => 'https://example.com',
} as unknown as ConfigService);
const context = (request: unknown) =>
  ({ switchToHttp: () => ({ getRequest: () => request }) }) as ExecutionContext;
describe('cookie origin policy', () => {
  it('allows a same-origin cookie write', () =>
    expect(
      guard.canActivate(
        context({
          method: 'PUT',
          headers: { origin: 'https://example.com' },
          cookies: { access_token: 'test' },
        }),
      ),
    ).toBe(true));
  it('rejects cross-origin writes', () =>
    expect(() =>
      guard.canActivate(
        context({
          method: 'POST',
          headers: { origin: 'https://attacker.example' },
          cookies: { access_token: 'test' },
        }),
      ),
    ).toThrow(ForbiddenException));
  it('rejects null origins', () =>
    expect(() =>
      guard.canActivate(
        context({ method: 'POST', headers: { origin: 'null' }, cookies: {} }),
      ),
    ).toThrow(ForbiddenException));
  it('rejects absent Origin with cookies', () =>
    expect(() =>
      guard.canActivate(
        context({
          method: 'POST',
          headers: {},
          cookies: { refresh_token: 'test' },
        }),
      ),
    ).toThrow(ForbiddenException));
  it('allows nonbrowser provider requests without cookies', () =>
    expect(
      guard.canActivate(context({ method: 'POST', headers: {}, cookies: {} })),
    ).toBe(true));
  it('leaves read authorization to auth/tenant guards', () =>
    expect(
      guard.canActivate(
        context({
          method: 'GET',
          headers: {},
          cookies: { access_token: 'test' },
        }),
      ),
    ).toBe(true));
});
