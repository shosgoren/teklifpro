import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { prisma } from '@/shared/utils/prisma'
import { emailService } from '@/infrastructure/services/email/EmailService'
import { ApiResponse } from '@/shared/types'
import { createApiHandler } from '@/infrastructure/middleware'

/**
 * Validation schema for registration
 */
const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Ad en az 2 karakter olmalıdır')
    .max(100, 'Ad en fazla 100 karakter olmalıdır'),
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  companyName: z
    .string()
    .min(2, 'Şirket adı en az 2 karakter olmalıdır')
    .max(255, 'Şirket adı en fazla 255 karakter olmalıdır'),
  phone: z
    .string()
    .regex(/^[+]?[\d\s\-()]+$/, 'Geçerli bir telefon numarası girin'),
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .regex(/[A-Z]/, 'Şifre en az bir büyük harf içermelidir')
    .regex(/[a-z]/, 'Şifre en az bir küçük harf içermelidir')
    .regex(/\d/, 'Şifre en az bir rakam içermelidir')
    .regex(/[!@#$%^&*]/, 'Şifre en az bir özel karakter içermelidir (!@#$%^&*)'),
})

type RegisterInput = z.infer<typeof registerSchema>

interface RegisterResponse {
  userId: string
  email: string
  name: string
  tenantId: string
  tenantSlug: string
  sessionToken: string
  message: string
}

/**
 * Generate slug from company name
 */
function generateSlug(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .substring(0, 50) // Limit to 50 chars
}

/**
 * Ensure slug is unique by appending random suffix if needed
 */
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const existing = await prisma.tenant.findUnique({
      where: { slug },
    })

    if (!existing) {
      return slug
    }

    slug = `${baseSlug}-${nanoid(6).toLowerCase()}`
    attempts++
  }

  throw new Error('Failed to generate unique tenant slug')
}

/**
 * Hash password with bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

/**
 * POST /api/v1/auth/register
 * Register a new user and create tenant
 */
async function handleRegister(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<RegisterResponse>>> {
  try {
    const body = await request.json()
    const data = registerSchema.parse(body)

    // Check if email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: data.email },
    })

    if (existingUser) {
      return NextResponse.json<ApiResponse<RegisterResponse>>(
        {
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'Bu e-posta adresi zaten kayıtlı',
          },
        },
        { status: 409 },
      )
    }

    // Generate unique tenant slug
    const baseSlug = generateSlug(data.companyName)
    const slug = await ensureUniqueSlug(baseSlug)

    // Hash password
    const hashedPassword = await hashPassword(data.password)

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    // Create tenant and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.companyName,
          slug,
          email: data.email,
          plan: 'STARTER',
          trialEndsAt,
        },
      })

      // Create user
      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          password: hashedPassword,
          tenantId: tenant.id,
          twoFactorEnabled: false,
          role: 'OWNER',
        },
      })

      return { tenant, user }
    })

    // Generate session token (in real app, this would be from NextAuth)
    const sessionToken = nanoid(32)

    // Send welcome email
    await emailService.sendWelcomeEmail(data.email, data.name)

    // Send email verification email
    // We'll create the email verification token and send the email
    await sendEmailVerificationEmail(result.user.id, data.email)

    // Log registration
    console.log('[REGISTRATION]', {
      userId: result.user.id,
      email: data.email,
      tenantId: result.tenant.id,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json<ApiResponse<RegisterResponse>>(
      {
        success: true,
        data: {
          userId: result.user.id,
          email: result.user.email,
          name: result.user.name || '',
          tenantId: result.tenant.id,
          tenantSlug: result.tenant.slug,
          sessionToken,
          message: 'Kayıt başarılı. Lütfen e-postanızı doğrulayın.',
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Registration error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json<ApiResponse<RegisterResponse>>(
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

    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json<ApiResponse<RegisterResponse>>(
        {
          success: false,
          error: {
            code: 'DUPLICATE_ENTRY',
            message: 'Bu e-posta veya şirket adı zaten kullanılmaktadır',
          },
        },
        { status: 409 },
      )
    }

    return NextResponse.json<ApiResponse<RegisterResponse>>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Kayıt sırasında bir hata oluştu',
        },
      },
      { status: 500 },
    )
  }
}

/**
 * Helper function to send email verification email
 */
async function sendEmailVerificationEmail(
  userId: string,
  email: string,
): Promise<void> {
  try {
    // Generate verification token
    const token = nanoid(32)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // Expires in 24 hours

    // Store verification token
    await prisma.emailVerificationToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    })

    // Send verification email
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/auth/verify-email?token=${token}`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
            .button { background: #667eea; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; display: inline-block; margin: 20px 0; }
            .code { background: white; padding: 15px; text-align: center; font-family: monospace; font-size: 14px; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>E-posta Doğrulaması</h1>
            </div>
            <div class="content">
              <p>Merhaba,</p>
              <p>TeklifPro'ya hoş geldiniz! Lütfen e-postanızı doğrulamak için aşağıdaki butona tıklayın:</p>
              <a href="${verificationUrl}" class="button">E-postayı Doğrula</a>
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                Veya bu bağlantıyı tarayıcınızda açın:<br/>
                <code>${verificationUrl}</code>
              </p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Bu bağlantı 24 saat içinde sona erecektir.
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2024 TeklifPro. Tüm hakları saklıdır.</p>
            </div>
          </div>
        </body>
      </html>
    `

    await emailService.sendVerificationEmail(email, html)
  } catch (error) {
    console.error('Failed to send verification email:', error)
    // Don't fail registration if email sending fails
  }
}

export const POST = createApiHandler(handleRegister, {
  public: true,
  rateLimit: true,
  requestsPerMinute: 5, // Strict rate limit for registration
})
