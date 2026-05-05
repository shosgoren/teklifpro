/**
 * WebAuthn / Passkey configuration for TeklifPro.
 * rpID = production'da teklifpro.vercel.app, dev'de localhost
 */

export function getRpConfig() {
  const url =
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'https://teklifpro.vercel.app'
  const u = new URL(url)
  return {
    rpID: u.hostname,
    origin: u.origin,
    rpName: 'TeklifPro',
  }
}

export function detectDeviceName(userAgent: string | null, fallback = 'Cihazım'): string {
  if (!userAgent) return fallback
  if (/iPhone/i.test(userAgent)) return 'iPhone'
  if (/iPad/i.test(userAgent)) return 'iPad'
  if (/Mac/i.test(userAgent)) return 'Mac'
  if (/Android/i.test(userAgent)) return 'Android cihaz'
  if (/Windows/i.test(userAgent)) return 'Windows PC'
  return fallback
}
