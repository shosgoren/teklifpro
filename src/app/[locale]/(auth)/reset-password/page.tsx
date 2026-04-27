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

// TODO: Zod validation messages are hardcoded in English. Consider using zod-i18n or
// passing translated messages from useTranslations() for full i18n support.
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

const inputClassName =
  'pl-10 rounded-xl bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-mint-500/20 h-11 transition-all';

const labelClassName =
  'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider';

export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  const tReset = useTranslations('resetPasswordPage');
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
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-mint-50 via-mint-50 to-mint-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
        <Card className="relative w-full max-w-md shadow-2xl border-0 bg-white dark:bg-gray-900 backdrop-blur-sm">
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{tReset('emailSentTitle')}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {tReset('emailSentDescription')}
            </p>
            <Link href={`/${locale}/login`}>
              <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-mint-600 to-mint-600 hover:from-mint-700 hover:to-mint-700 text-white shadow-lg shadow-mint-500/25 transition-all">
                {tReset('backToLogin')}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (success && token) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-mint-50 via-mint-50 to-mint-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
        <Card className="relative w-full max-w-md shadow-2xl border-0 bg-white dark:bg-gray-900 backdrop-blur-sm">
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{tReset('passwordResetTitle')}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {tReset('passwordResetDescription')}
            </p>
            <Link href={`/${locale}/login`}>
              <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-mint-600 to-mint-600 hover:from-mint-700 hover:to-mint-700 text-white shadow-lg shadow-mint-500/25 transition-all">
                {tReset('login')}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-mint-50 via-mint-50 to-mint-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
      <Card className="relative w-full max-w-md shadow-2xl border-0 bg-white dark:bg-gray-900 backdrop-blur-sm">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-mint-600 to-mint-600 bg-clip-text text-transparent mb-2">
              TeklifPro
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {token ? tReset('setNewPassword') : tReset('sendResetLink')}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
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
                      <FormLabel className={labelClassName}>{tReset('newPassword')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className={inputClassName}
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
                      <FormLabel className={labelClassName}>{tReset('confirmPassword')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className={inputClassName}
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
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-mint-600 to-mint-600 hover:from-mint-700 hover:to-mint-700 text-white shadow-lg shadow-mint-500/25 transition-all"
                >
                  {isLoading ? tReset('updating') : tReset('updatePassword')}
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
                      <FormLabel className={labelClassName}>{tReset('emailLabel')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            className={inputClassName}
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
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-mint-600 to-mint-600 hover:from-mint-700 hover:to-mint-700 text-white shadow-lg shadow-mint-500/25 transition-all"
                >
                  {isLoading ? tReset('sending') : tReset('sendResetButton')}
                </Button>
              </form>
            </Form>
          )}

          <p className="mt-6 text-center">
            <Link
              href={`/${locale}/login`}
              className="text-sm text-mint-600 dark:text-mint-400 hover:text-mint-700 dark:hover:text-mint-300 font-medium inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              {tReset('backToLoginLink')}
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
