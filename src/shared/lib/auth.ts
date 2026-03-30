import { getServerSessionWithAuth } from '@/infrastructure/middleware/authMiddleware';

/**
 * Get session for use in API routes and server components.
 * Returns null if not authenticated.
 */
export async function getSession() {
  const session = await getServerSessionWithAuth();
  if (!session) return null;
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      tenantId: session.user.tenantId,
    },
  };
}
