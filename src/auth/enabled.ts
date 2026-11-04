// The public site needs no login. Sign-in stays unmounted unless explicitly enabled, so nobody can make the
// credentials endpoint spend password-hashing CPU.
export function isAuthEnabled(): boolean {
  return process.env.AUTH_ENABLED === "1";
}
