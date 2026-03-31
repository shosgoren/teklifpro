import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/shared/utils/prisma'
import { ApiResponse } from '@/shared/types'
import { createApiHandler } from '@/infrastructure/middleware'

/**
 * Validation schemas
 */
const requestResetSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset kodu gerekli'),
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .regex(/[A-Z]/, 'Şifre en az bir büyük harf içermelidir')
    .regex(/[a-z]/, 'Şifre en az bir küçük harf içermelidir')
    .regex(/\d/, 'Şifre en az bir rakam içermelidir')
    .regex(/[!@#$%^&*]/, 'Şifre en az bir özel karakter içermelidir (!@#$%^&*)'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
})

type RequestResetInput = z.infer<typeof requestResetSchema>
type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

interface ResetRequestResponse {
  message: string
  email: string
}

interface ResetPasswordResponse {
  message: string
  success: boolean
}

/**
 * Password strength validation
 */
function validatePasswordStrength(password: string): {
  strength: 'WEAK' | 'FAIR' | 'GOOD' | 'STRONG'
  score: number
  feedback: string[]
} {
  let score = 0
  const feedback: string[] = []

  // Length check
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1

  // Character diversity
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[!@#$%^&*]/.test(password)) score += 1

  // Common patterns
  if (!/(.)\1{2,}/.test(password)) score += 1 // No repeating characters
  if (!/^[a-zA-Z]+\d+$|^\d+[a-zA-Z]+$/.test(password)) score += 1 // Not just pattern

  // Determine strength
  let strength: 'WEAK' | 'FAIR' | 'GOOD' | 'STRONG' = 'WEAK'
  if (score <= 2) {
    strength = 'WEAK'
    feedback.push('Şifre çok zayıf. Daha karmaşık bir şifre seçin.')
  } else if (score <= 4) {
    strength = 'FAIR'
    feedback.push('Şifre orta düzeyde. Daha fazla çeşitlilik ekleyin.')
  } else if (score <= 6) {
    strength = 'GOOD'
    feedback.push('Şifre iyi.')
  } else {
    strength = 'STRONG'
    feedback.push('Şifre güçlü.')
  }

  return { strength, score: Math.min(score, 10), feedback }
}

/**
 * POST /api/v1/auth/reset-password
 * Request password reset email
 */
async function handleRequestPasswordReset(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ResetRequestResponse>>> {
  try {
    const body = await request.json()
    const data = requestResetSchema.parse(body)

    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email: data.email },
    })

    if (!user) {
      // Don't reveal if email exists (security best practice)
      return NextResponse.json<ApiResponse<ResetRequestResponse>>(
        {
          success: true,
          data: {
            message:
              'Şifre sıfırlama bağlantısını e-postanıza gönderdik. Lütfen kontrol edin.',
            email: data.email,
          },
        },
        { status: 200 },
      )
    }

    // Delete any existing reset tokens
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    })

    // Generate reset token
    const token = generateToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // Expires in 1 hour

    // Create reset token record
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    // Send reset email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`

    const html = buildResetEmailTemplate({
      name: user.name || 'Kullanıcı',
      resetUrl,
    })

    // Send email
    try {
      const emailService = require('@/infrastructure/services/email/EmailService')
        .emailService as any
      await emailService.sendPasswordResetEmail(data.email, html)
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError)
      // Don't fail the request if email sending fails
    }

    console.log('[PASSWORD_RESET_REQUESTED]', {
      userId: user.id,
      email: data.email,
      tokenHash: token.substring(0, 8),
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json<ApiResponse<ResetRequestResponse>>(
      {
        success: true,
        data: {
          message:
            'Şifre sıfırlama bağlantısını e-postanıza gönderdik. Lütfen kontrol edin.',
          email: data.email,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Password reset request error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json<ApiResponse<ResetRequestResponse>>(
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

    return NextResponse.json<ApiResponse<ResetRequestResponse>>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Şifre sıfırlama talebinde bir hata oluştu',
        },
      },
      { status: 500 },
    )
  }
}

/**
 * PUT /api/v1/auth/reset-password
 * Reset password with valid token
 */
async function handleResetPassword(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ResetPasswordResponse>>> {
  try {
    const body = await request.json()
    const data = resetPasswordSchema.parse(body)

    // Find and validate token
    const tokenRecord = await prisma.emailVerificationToken.findUnique({
      where: { token: data.token },
      include: { user: true },
    })

    if (!tokenRecord) {
      return NextResponse.json<ApiResponse<ResetPasswordResponse>>(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Geçersiz veya süresi dolmuş şifre sıfırlama kodu',
          },
        },
        { status: 400 },
      )
    }

    // Check if token expired
    if (tokenRecord.expiresAt < new Date()) {
      // Delete expired token
      await prisma.emailVerificationToken.delete({
        where: { token: data.token },
      })

      return NextResponse.json<ApiResponse<ResetPasswordResponse>>(
        {
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Şifre sıfırlama kodu süresi dolmuştur. Lütfen yeni bir talep oluşturun.',
          },
        },
        { status: 400 },
      )
    }

    // Validate password strength
    const strength = validatePasswordStrength(data.password)
    if (strength.strength === 'WEAK') {
      return NextResponse.json<ApiResponse<ResetPasswordResponse>>(
        {
          success: false,
          error: {
            code: 'WEAK_PASSWORD',
            message: strength.feedback.join(' '),
          },
        },
        { status: 400 },
      )
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12)
    const hashedPassword = await bcrypt.hash(data.password, salt)

    // Update user password
    await prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { password: hashedPassword },
    })

    // Delete used token
    await prisma.emailVerificationToken.delete({
      where: { token: data.token },
    })

    // Optionally invalidate all other sessions
    // In production, you might want to revoke all refresh tokens here

    console.log('[PASSWORD_RESET_COMPLETED]', {
      userId: tokenRecord.user.id,
      email: tokenRecord.user.email,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json<ApiResponse<ResetPasswordResponse>>(
      {
        success: true,
        data: {
          message: 'Şifreniz başarıyla sıfırlanmıştır. Lütfen yeni şifrenizle giriş yapın.',
          success: true,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Password reset error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json<ApiResponse<ResetPasswordResponse>>(
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

    return NextResponse.json<ApiResponse<ResetPasswordResponse>>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Şifre sıfırlama sırasında bir hata oluştu',
        },
      },
      { status: 500 },
    )
  }
}

/**
 * Generate a random token
 */
function generateToken(): string {
  const { nanoid } = require('nanoid')
  return nanoid(32)
}

/**
 * Build password reset email HTML template
 */
function buildResetEmailTemplate({
  name,
  resetUrl,
}: {
  name: string
  resetUrl: string
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
          .button { background: #667eea; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; display: inline-block; margin: 20px 0; }
          .info-box { background: #fef2f2; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Şifre Sıfırlama</h1>
          </div>
          <div class="content">
            <p>Merhaba <strong>${name}</strong>,</p>
            <p>TeklifPro hesabınızı kullanarak bir şifre sıfırlama talebinde bulunulmuştur. Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>

            <a href="${resetUrl}" class="button">Şifremi Sıfırla</a>

            <div class="info-box">
              <strong>Önemli:</strong> Bu bağlantı 1 saat boyunca geçerlidir. Bu süre içinde şifrenizi sıfırlamadığınız takdirde, yeni bir talep oluşturmanız gerekecektir.
            </div>

            <p>Eğer butona tıklayamıyorsanız, aşağıdaki bağlantıyı tarayıcınızda açın:</p>
            <p style="word-break: break-all; font-size: 12px; color: #666;">
              ${resetUrl}
            </p>

            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Eğer bu talebini siz yapmadıysanız, bu e-postayı görmezden gelin ve hesabınızın güvenli olduğundan emin olun.
            </p>

            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Herhangi bir sorunuz varsa, destek ekibimizle iletişime geçin.
            </p>
          </div>
          <div class="footer">
            <p>&copy; 2026 TeklifPro. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

// Export handlers
export const POST = createApiHandler(handleRequestPasswordReset, {
  public: true,
  rateLimit: true,
  requestsPerMinute: 5,
})

export const PUT = createApiHandler(handleResetPassword, {
  public: true,
  rateLimit: true,
  requestsPerMinute: 5,
})
