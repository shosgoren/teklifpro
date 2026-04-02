import { z } from 'zod'

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Ad en az 2 karakter olmalidir')
    .max(100, 'Ad en fazla 100 karakter olmalidir'),
  email: z.string().email('Gecerli bir e-posta adresi girin'),
  companyName: z
    .string()
    .min(2, 'Sirket adi en az 2 karakter olmalidir')
    .max(255, 'Sirket adi en fazla 255 karakter olmalidir'),
  phone: z
    .string()
    .regex(/^[+]?[\d\s\-()]+$/, 'Gecerli bir telefon numarasi girin'),
  password: z
    .string()
    .min(8, 'Sifre en az 8 karakter olmalidir')
    .regex(/[A-Z]/, 'Sifre en az bir buyuk harf icermelidir')
    .regex(/[a-z]/, 'Sifre en az bir kucuk harf icermelidir')
    .regex(/\d/, 'Sifre en az bir rakam icermelidir')
    .regex(/[!@#$%^&*]/, 'Sifre en az bir ozel karakter icermelidir (!@#$%^&*)'),
})

export const requestResetSchema = z.object({
  email: z.string().email('Gecerli bir e-posta adresi girin'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset kodu gerekli'),
  password: z
    .string()
    .min(8, 'Sifre en az 8 karakter olmalidir')
    .regex(/[A-Z]/, 'Sifre en az bir buyuk harf icermelidir')
    .regex(/[a-z]/, 'Sifre en az bir kucuk harf icermelidir')
    .regex(/\d/, 'Sifre en az bir rakam icermelidir')
    .regex(/[!@#$%^&*]/, 'Sifre en az bir ozel karakter icermelidir (!@#$%^&*)'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Sifreler eslesmiyor',
  path: ['confirmPassword'],
})

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Dogrulama kodu gerekli'),
})

export const sendVerificationEmailSchema = z.object({
  email: z.string().email('Gecerli bir e-posta adresi girin'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type RequestResetInput = z.infer<typeof requestResetSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>
export type SendVerificationEmailInput = z.infer<typeof sendVerificationEmailSchema>
