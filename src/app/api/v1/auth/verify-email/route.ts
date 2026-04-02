import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/shared/utils/prisma'
import { ApiResponse } from '@/shared/types'
import { createApiHandler } from '@/infrastructure/middleware'
import { Logger } from '@/infrastructure/logger'
import { verifyEmailSchema, sendVerificationEmailSchema } from '@/shared/validations/auth'

const logger = new Logger('AuthVerifyEmailAPI')

interface VerifyEmailResponse {
  message: string
  emailVerified: boolean
}

interface SendVerificationResponse {
  message: string
  email: string
}

/**
 * POST /api/v1/auth/verify-email
 * Send verification email with token
 */
async function handleSendVerificationEmail(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<SendVerificationResponse>>> {
  try {
    const body = await request.json()
    const data = sendVerificationEmailSchema.parse(body)

    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email: data.email },
    })

    if (!user) {
      // Don't reveal if email exists (security best practice)
      return NextResponse.json<ApiResponse<SendVerificationResponse>>(
        {
          success: true,
          data: {
            message: 'E-posta adresine bir doğrulama bağlantısı gönderdik',
            email: data.email,
          },
        },
        { status: 200 },
      )
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json<ApiResponse<SendVerificationResponse>>(
        {
          success: true,
          data: {
            message: 'Bu e-posta adresi zaten doğrulanmıştır',
            email: data.email,
          },
        },
        { status: 200 },
      )
    }

    // Delete any existing tokens
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    })

    // Generate new verification token
    const token = generateToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // Expires in 24 hours

    // Create token record
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    // Send verification email
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${token}`

    const html = buildVerificationEmailTemplate({
      name: user.name || 'Kullanıcı',
      verificationUrl,
    })

    // Send email
    const emailService = require('@/infrastructure/services/email/EmailService')
      .emailService as any
    await emailService.sendVerificationEmail(data.email, html)

    logger.info('EMAIL_VERIFICATION_SENT', {
      userId: user.id,
      email: data.email,
      tokenHash: token.substring(0, 8),
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json<ApiResponse<SendVerificationResponse>>(
      {
        success: true,
        data: {
          message: 'E-posta adresine bir doğrulama bağlantısı gönderdik',
          email: data.email,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    logger.error('Send verification email error', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json<ApiResponse<SendVerificationResponse>>(
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

    return NextResponse.json<ApiResponse<SendVerificationResponse>>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'E-posta gönderme sırasında bir hata oluştu',
        },
      },
      { status: 500 },
    )
  }
}

/**
 * GET /api/v1/auth/verify-email?token=xxx
 * Verify email token and mark email as verified
 */
async function handleVerifyEmailToken(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<VerifyEmailResponse>>> {
  try {
    const token = request.nextUrl.searchParams.get('token')

    const data = verifyEmailSchema.parse({ token })

    // Find token record
    const tokenRecord = await prisma.emailVerificationToken.findUnique({
      where: { token: data.token },
      include: { user: true },
    })

    if (!tokenRecord) {
      return NextResponse.json<ApiResponse<VerifyEmailResponse>>(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Geçersiz veya süresi dolmuş doğrulama kodu',
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

      return NextResponse.json<ApiResponse<VerifyEmailResponse>>(
        {
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Doğrulama kodu süresi dolmuştur. Lütfen yeni bir kodu talep edin.',
          },
        },
        { status: 400 },
      )
    }

    // Update user email verification status
    const user = await prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { emailVerified: new Date() },
    })

    // Delete used token
    await prisma.emailVerificationToken.delete({
      where: { token: data.token },
    })

    logger.info('EMAIL_VERIFIED', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json<ApiResponse<VerifyEmailResponse>>(
      {
        success: true,
        data: {
          message: 'E-postanız başarıyla doğrulanmıştır',
          emailVerified: true,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    logger.error('Email verification error', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json<ApiResponse<VerifyEmailResponse>>(
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

    return NextResponse.json<ApiResponse<VerifyEmailResponse>>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'E-posta doğrulama sırasında bir hata oluştu',
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
 * Build verification email HTML template
 */
function buildVerificationEmailTemplate({
  name,
  verificationUrl,
}: {
  name: string
  verificationUrl: string
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
          .info-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
          code { background: #e5e7eb; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>E-posta Doğrulaması</h1>
          </div>
          <div class="content">
            <p>Merhaba <strong>${name}</strong>,</p>
            <p>TeklifPro'ya kayıt olduğunuz için teşekkür ederiz. Lütfen e-postanızı doğrulamak için aşağıdaki butona tıklayın:</p>

            <a href="${verificationUrl}" class="button">E-postayı Doğrula</a>

            <div class="info-box">
              <p style="margin: 0; color: #666; font-size: 12px;">
                <strong>Not:</strong> Eğer butona tıklayamıyorsanız, aşağıdaki bağlantıyı tarayıcınızda açın:
              </p>
            </div>

            <p style="word-break: break-all; font-size: 12px; color: #666;">
              ${verificationUrl}
            </p>

            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Bu bağlantı 24 saat içinde sona erecektir. 24 saatin ardından yeni bir doğrulama kodu talep etmeniz gerekecektir.
            </p>

            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Eğer sizin kayıt olmadığınız bir hesap için bu e-postayı aldıysanız, lütfen bu e-postayı görmezden gelin.
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
export const POST = createApiHandler(handleSendVerificationEmail, {
  public: true,
  rateLimit: true,
  requestsPerMinute: 5,
})

export const GET = createApiHandler(handleVerifyEmailToken, {
  public: true,
  rateLimit: true,
  requestsPerMinute: 10,
})
