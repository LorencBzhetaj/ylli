import type { NextConfig } from 'next'

const PROD = process.env.NODE_ENV === 'production'

/**
 * Content-Security-Policy: only this origin. No third-party scripts, fonts, trackers or frames.
 * 'unsafe-inline' scripts are needed by Next.js' inline bootstrap without a nonce setup; 'unsafe-eval' only in dev (React dev tools).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${PROD ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self'",
  `connect-src 'self'${PROD ? '' : ' ws: wss:'}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(PROD ? ['upgrade-insecure-requests'] : []),
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  ...(PROD ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }] : []),
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Dev only: let a phone on the same Wi-Fi load the dev server (NADIA_LAN_HOST=192.168.x.y). Ignored in production.
  ...(process.env.NADIA_LAN_HOST ? { allowedDevOrigins: [process.env.NADIA_LAN_HOST] } : {}),
  // Private media and local secrets must never be copied into server bundles.
  outputFileTracingExcludes: {
    '/*': ['./private/**/*', './.env*', './docs/**/*', './assets/**/*', './scripts/**/*', './tests/**/*'],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Entry page too: never keep an authenticated redirect / page in any cache.
      { source: '/', headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }] },
      { source: '/experience/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }] },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ]
  },
}

export default nextConfig
