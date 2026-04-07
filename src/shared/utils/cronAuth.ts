import crypto from 'crypto';
import { NextRequest } from 'next/server';

/**
 * Verify cron request authenticity:
 * 1. Check CRON_SECRET bearer token (timing-safe comparison)
 * 2. Verify Vercel cron signature header when available
 */
export function verifyCronRequest(request: NextRequest): boolean {
  // Check bearer token (required)
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  if (token.length !== secret.length) return false;
  const tokenValid = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret));
  if (!tokenValid) return false;

  // Verify Vercel cron signature if present (extra security layer)
  // Vercel sets 'x-vercel-cron' header on legitimate cron invocations
  // In production, enforce this header; in development, skip
  if (process.env.VERCEL === '1') {
    const vercelCronHeader = request.headers.get('x-vercel-cron');
    if (!vercelCronHeader) return false;
  }

  return true;
}
