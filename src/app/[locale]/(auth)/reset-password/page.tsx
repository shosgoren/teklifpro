'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Mail, Lock, ArrowLeft, CheckCircle } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Card } from '@/shared/components/ui/card';
import { cn } from '@/shared/utils/cn';

const requestResetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z
  .object({
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase letter')
      .regex(/[a-z]/, 'Must contain lowercase letter')
      .regex(/[0-9]/, 'Must contain a digit')
      .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RequestResetValues = z.infer<typeof requestResetSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const requestForm = useForm<RequestResetValues>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: { email: '' },
  });

  const resetForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const handleRequestReset = async (values: RequestResetValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to send reset email');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (values: ResetPasswordValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/reset-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: values.password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to reset password');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (success && !token) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <Card className="relative w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <div className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">E-posta Gönderildi</h2>
            <p className="text-gray-600 mb-6">
              Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.
            </p>
            <Link href={`/${locale}/login`}>
              <Button className="w-full">Giriş Sayfasına Dön</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (success && token) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <Card className="relative w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <div className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Şifre Sıfırlandı</h2>
            <p className="text-gray-600 mb-6">
              Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.
            </p>
            <Link href={`/${locale}/login`}>
              <Button className="w-full">Giriş Yap</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="relative w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              TeklifPro
            </h1>
            <p className="text-gray-600 text-sm">
              {token ? 'Yeni şifrenizi belirleyin' : 'Şifre sıfırlama bağlantısı gönderin'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {token ? (
            <Form {...resetForm}>
              <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
                <FormField
                  control={resetForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 text-sm font-medium">Yeni Şifre</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="pl-10 h-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={resetForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 text-sm font-medium">Şifre Tekrar</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="pl-10 h-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  {isLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...requestForm}>
              <form onSubmit={requestForm.handleSubmit(handleRequestReset)} className="space-y-4">
                <FormField
                  control={requestForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 text-sm font-medium">E-posta Adresi</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            className="pl-10 h-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  {isLoading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
                </Button>
              </form>
            </Form>
          )}

          <p className="mt-6 text-center">
            <Link
              href={`/${locale}/login`}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Giriş sayfasına dön
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
