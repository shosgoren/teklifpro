import { getServerSessionWithAuth, type AuthSession } from '@/infrastructure/middleware/authMiddleware';

/**
 * Get session for use in API routes and server components.
 * Returns null if not authenticated.
 */
export async function getSession(): Promise<AuthSession | null> {
  return getServerSessionWithAuth();
}
