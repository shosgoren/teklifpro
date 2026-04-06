import { DefaultSession, DefaultUser } from 'next-auth'
import { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      tenantId: string
      role: string
    } & DefaultSession['user']
    tenant?: {
      slug: string
      plan: string
    }
    permissions?: string[]
  }

  interface User extends DefaultUser {
    tenantId?: string
    role?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string
    tenantId?: string
    role?: string
    tenantSlug?: string
    tenantPlan?: string
  }
}
