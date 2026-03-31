import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/shared/utils/prisma'
import { ApiResponse } from '@/shared/types'
import { createApiHandler } from '@/infrastructure/middleware'

/**
 * Login validation schema
 */
const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  password: z.string().min(1, 'Şifre zorunludur'),
  rememberMe: z.boolean().optional(),
})

interface LoginResponse {
  userId: string
  email: string
  name: string
  tenantId: string
  tenantSlug: string
  role: string
  message: string
}

/**
 * POST /api/v1/auth/login
 * Authenticate user with email and password
 */
async function handleLogin(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<LoginResponse>>> {
  try {
    const body = await request.json()
    const data = loginSchema.parse(body)

    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email: data.email },
      include: { tenant: true },
    })

    if (!user) {
      return NextResponse.json<ApiResponse<LoginResponse>>(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'E-posta veya şifre hatalı',
          },
        },
        { status: 401 },
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, user.password || '')

    if (!isPasswordValid) {
      return NextResponse.json<ApiResponse<LoginResponse>>(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'E-posta veya şifre hatalı',
          },
        },
        { status: 401 },
      )
    }

    // Check if account is active
    if (!user.isActive) {
      return NextResponse.json<ApiResponse<LoginResponse>>(
        {
          success: false,
          error: {
            code: 'ACCOUNT_DISABLED',
            message: 'Hesabınız devre dışı bırakılmış',
          },
        },
        { status: 403 },
      )
    }

    // Check if tenant is active
    if (!user.tenant?.isActive) {
      return NextResponse.json<ApiResponse<LoginResponse>>(
        {
          success: false,
          error: {
            code: 'TENANT_INACTIVE',
            message: 'Şirket hesabı aktif değil',
          },
        },
        { status: 403 },
      )
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Log login
    console.log('[LOGIN]', {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json<ApiResponse<LoginResponse>>(
      {
        success: true,
        data: {
          userId: user.id,
          email: user.email,
          name: user.name || '',
          tenantId: user.tenantId,
          tenantSlug: user.tenant?.slug || '',
          role: user.role,
          message: 'Giriş başarılı',
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Login error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json<ApiResponse<LoginResponse>>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Doğrulama hatası',
            details: error.flatten().fieldErrors as Record<string, string[]>,
          },
        },
        { status: 400 },
      )
    }

    return NextResponse.json<ApiResponse<LoginResponse>>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Giriş sırasında bir hata oluştu',
        },
      },
      { status: 500 },
    )
  }
}

export const POST = createApiHandler(handleLogin, {
  public: true,
  rateLimit: true,
  requestsPerMinute: 10,
})
