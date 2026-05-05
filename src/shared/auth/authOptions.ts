import { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'
import { prisma } from '@/shared/utils/prisma'
import { Logger } from '@/infrastructure/logger'
import { getRpConfig } from '@/shared/auth/webauthn'

const logger = new Logger('Auth')

/**
 * NextAuth options for TeklifPro
 * Supports credentials and Google OAuth authentication
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    CredentialsProvider({
      id: 'passkey',
      name: 'Passkey',
      credentials: {
        response: { label: 'WebAuthn response', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.response) {
          throw new Error('Passkey response missing')
        }

        let response: AuthenticationResponseJSON
        try {
          response = JSON.parse(credentials.response) as AuthenticationResponseJSON
        } catch {
          throw new Error('Invalid passkey response')
        }

        const auth = await prisma.authenticator.findUnique({
          where: { credentialID: response.id },
          include: { user: { include: { tenant: true } } },
        })
        if (!auth) {
          logger.warn('Passkey not found', { credentialId: response.id })
          throw new Error('Passkey not found')
        }
        if (!auth.user.isActive || auth.user.deletedAt) {
          throw new Error('Account is disabled')
        }
        if (!auth.user.tenant?.isActive) {
          throw new Error('Tenant account is not active')
        }

        const challenge = await prisma.webAuthnChallenge.findFirst({
          where: {
            kind: 'AUTHENTICATION',
            expiresAt: { gt: new Date() },
            OR: [{ userId: auth.userId }, { userId: null }],
          },
          orderBy: { createdAt: 'desc' },
        })
        if (!challenge) {
          throw new Error('Challenge not found or expired')
        }

        const { rpID, origin } = getRpConfig()

        let verification
        try {
          verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge: challenge.challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            credential: {
              id: auth.credentialID,
              publicKey: new Uint8Array(auth.publicKey),
              counter: Number(auth.counter),
              transports: auth.transports as AuthenticatorTransport[],
            },
            requireUserVerification: false,
          })
        } catch (err) {
          logger.warn('Passkey verification error', err)
          throw new Error('Passkey verification failed')
        }

        if (!verification.verified) {
          throw new Error('Passkey not verified')
        }

        // Counter güncelle (replay önleme), challenge tüket
        await prisma.$transaction([
          prisma.authenticator.update({
            where: { id: auth.id },
            data: {
              counter: BigInt(verification.authenticationInfo.newCounter),
              lastUsedAt: new Date(),
            },
          }),
          prisma.webAuthnChallenge.delete({ where: { id: challenge.id } }),
        ])

        return {
          id: auth.user.id,
          email: auth.user.email,
          name: auth.user.name,
          tenantId: auth.user.tenantId,
          role: auth.user.role,
        }
      },
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'your@email.com',
        },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required')
        }

        try {
          // Find user by email
          const user = await prisma.user.findFirst({
            where: { email: credentials.email },
            include: { tenant: true },
          })

          if (!user) {
            throw new Error('Invalid email or password')
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password || '',
          )

          if (!isPasswordValid) {
            throw new Error('Invalid email or password')
          }

          // Check if account is active
          if (!user.isActive) {
            throw new Error('Account is disabled')
          }

          // Check if tenant is active
          if (!user.tenant?.isActive) {
            throw new Error('Tenant account is not active')
          }

          // Return user object that will be passed to JWT
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            tenantId: user.tenantId,
            role: user.role,
          }
        } catch (error) {
          logger.error('Auth error', error)
          throw new Error(
            error instanceof Error ? error.message : 'Authentication failed',
          )
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          const existingUser = await prisma.user.findFirst({
            where: { email: user.email! },
          })

          if (!existingUser) {
            // Auto-create tenant and user for Google OAuth
            const tenant = await prisma.tenant.create({
              data: {
                name: user.name || 'My Company',
                email: user.email!,
                slug: user.email!.split('@')[0] + '-' + Date.now(),
                plan: 'STARTER',
                isActive: true,
              },
            })

            await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name || '',
                role: 'OWNER',
                isActive: true,
                emailVerified: new Date(),
                tenantId: tenant.id,
              },
            })
          }
          return true
        } catch (error) {
          logger.error('Google OAuth error', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, trigger, session, account }) {
      // Initial signin
      if (user) {
        if (account?.provider === 'google') {
          // Fetch full user data for Google OAuth users
          const dbUser = await prisma.user.findFirst({
            where: { email: user.email! },
            include: { tenant: true },
          })
          if (dbUser) {
            token.id = dbUser.id
            token.tenantId = dbUser.tenantId
            token.role = dbUser.role
            token.tenantSlug = dbUser.tenant?.slug || ''
            token.tenantPlan = dbUser.tenant?.plan || 'STARTER'
          }
        } else {
          token.id = user.id
          token.tenantId = user.tenantId
          token.role = user.role
          // Fetch tenant details for credentials login
          if (user.tenantId) {
            const tenant = await prisma.tenant.findUnique({
              where: { id: user.tenantId },
              select: { slug: true, plan: true },
            })
            if (tenant) {
              token.tenantSlug = tenant.slug
              token.tenantPlan = tenant.plan
            }
          }
        }
      }

      // Update token on refresh
      if (trigger === 'update' && session) {
        token.tenantId = session.tenantId
        token.role = session.role
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.tenantId = token.tenantId as string
        session.user.role = token.role as string
      }
      session.tenant = {
        slug: (token.tenantSlug as string) || '',
        plan: (token.tenantPlan as string) || 'STARTER',
      }

      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
    newUser: '/register',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // 1 day
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  debug: process.env.NODE_ENV === 'development',
  events: {
    async signIn({ user, account }) {
      logger.info('User signed in', {
        userId: user.id,
        email: user.email,
        provider: account?.provider,
        timestamp: new Date().toISOString(),
      })
    },
    async signOut({ token }) {
      logger.info('User signed out', {
        userId: token.id,
        timestamp: new Date().toISOString(),
      })
    },
  },
}
