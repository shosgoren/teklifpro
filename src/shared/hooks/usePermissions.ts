'use client'

import { useSession } from 'next-auth/react'
import { useMemo } from 'react'
import { getPermissionsForRole } from '@/shared/auth/permissions'

/**
 * Client-side hook to check user permissions.
 * Derives permissions from the user's role in the session.
 */
export function usePermissions() {
  const { data: session } = useSession()

  const permissions = useMemo(() => {
    const role = session?.user?.role as string | undefined
    return role ? getPermissionsForRole(role) : []
  }, [session?.user?.role])

  const can = useMemo(() => {
    return (...required: string[]) => {
      if (permissions.includes('*')) return true
      return required.every(perm => {
        if (permissions.includes(perm)) return true
        const [resource] = perm.split('.')
        return permissions.includes(`${resource}.*`)
      })
    }
  }, [permissions])

  return {
    permissions,
    can,
    role: (session?.user?.role as string) || 'VIEWER',
    isOwner: session?.user?.role === 'OWNER',
    isAdmin: session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER',
  }
}
