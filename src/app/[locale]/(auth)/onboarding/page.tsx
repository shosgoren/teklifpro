'use client';

import { useState, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Logger } from '@/infrastructure/logger';
import {
  Building2,
  Lock,
  Phone,
  MapPin,
  Upload,
  CheckCircle,
  AlertCircle,
  Zap,
  ArrowRight,
  PartyPopper as ConfettiIcon,
} from 'lucide-react';

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

const logger = new Logger('OnboardingPage');

// Shared style constants
const inputClasses =
  'rounded-xl bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 h-11 transition-all';
const inputWithIconClasses = `pl-10 ${inputClasses}`;
const textareaClasses =
  'pl-10 p-2 w-full border rounded-xl bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none text-gray-900 dark:text-gray-100';
const labelClasses = 'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider';
const primaryBtnClasses =
  'w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 transform hover:scale-[1.02] active:scale-95';
const iconClasses = 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500';

// Step 1: Company Info Schema
const companyInfoSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  taxNumber: z.string().min(5, 'Tax number is required'),
  taxOffice: z.string().min(2, 'Tax office is required'),
  address: z.string().min(5, 'Address is required'),
  phone: z.string().regex(/^[+]?[0-9\s-()]+$/, 'Invalid phone number'),
  logo: z.instanceof(File).optional(),
});

// Step 2: Parasut Integration Schema
const parasutSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required').optional().or(z.literal('')),
  clientId: z.string().min(1, 'Client ID is required').optional().or(z.literal('')),
  clientSecret: z.string().min(1, 'Client Secret is required').optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  password: z.string().min(1, 'Password is required').optional().or(z.literal('')),
});

// Step 3: WhatsApp Schema
const whatsappSchema = z.object({
  phoneId: z.string().min(1, 'Phone ID is required').optional().or(z.literal('')),
  accessToken: z.string().min(1, 'Access Token is required').optional().or(z.literal('')),
});

type CompanyInfoFormValues = z.infer<typeof companyInfoSchema>;
type ParasutFormValues = z.infer<typeof parasutSchema>;
type WhatsappFormValues = z.infer<typeof whatsappSchema>;

// Step Component Props
interface StepProps {
  isActive: boolean;
  isCompleted: boolean;
  stepNumber: number;
  title: string;
  children: React.ReactNode;
}

const Step: React.FC<StepProps> = ({
  isActive,
  isCompleted,
  stepNumber,
  title,
  children,
}) => {
  return (
    <div
      className={cn(
        'transition-all duration-300',
        !isActive && 'hidden'
      )}
    >
      {children}
    </div>
  );
};

// Progress Indicator
interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  completedSteps,
}) => {
  const steps = [
    { number: 1, label: 'Company Info' },
    { number: 2, label: 'Parasut Integration' },
    { number: 3, label: 'WhatsApp Settings' },
    { number: 4, label: 'Done' },
  ];

  return (
    <div className="mb-8">
      {/* Progress Bar */}
      <div className="flex gap-2 mb-6">
        {steps.map((step, index) => {
          const isActive = step.number === currentStep;
          const isCompleted = completedSteps.includes(step.number);

          return (
            <div key={step.number} className="flex items-center flex-1">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300',
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 scale-110'
                    : isCompleted
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-2 border-green-300 dark:border-green-700'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-2 border-gray-200 dark:border-gray-700'
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  step.number
                )}
              </div>

              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-1 mx-2 rounded-full transition-all duration-300',
                    isCompleted || currentStep > step.number
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Label */}
      <p className="text-center text-sm font-medium text-gray-600 dark:text-gray-400">
        {steps[currentStep - 1]?.label}
      </p>
    </div>
  );
};

// Confetti Animation
const Confetti = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useState(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface ConfettiParticle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      opacity: number;
    }

    const particles: ConfettiParticle[] = [];
    const colors = ['#3B82F6', '#A855F7', '#EC4899', '#F59E0B', '#10B981'];

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 4 + 2,
        speedX: Math.random() * 4 - 2,
        speedY: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, index) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.opacity -= 0.01;

        if (particle.opacity <= 0) {
          particles.splice(index, 1);
        }

        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      });

      ctx.globalAlpha = 1;

      if (particles.length > 0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  });

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" />;
};

export default function OnboardingPage() {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const locale = useLocale();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Form 1: Company Info
  const companyForm = useForm<CompanyInfoFormValues>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      companyName: '',
      taxNumber: '',
      taxOffice: '',
      address: '',
      phone: '',
    },
  });

  // Form 2: Parasut
  const parasutForm = useForm<ParasutFormValues>({
    resolver: zodResolver(parasutSchema),
    defaultValues: {
      companyId: '',
      clientId: '',
      clientSecret: '',
      email: '',
      password: '',
    },
  });

  // Form 3: WhatsApp
  const whatsappForm = useForm<WhatsappFormValues>({
    resolver: zodResolver(whatsappSchema),
    defaultValues: {
      phoneId: '',
      accessToken: '',
    },
  });

  const handleCompanySubmit = async (values: CompanyInfoFormValues) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('companyName', values.companyName);
      formData.append('taxNumber', values.taxNumber);
      formData.append('taxOffice', values.taxOffice);
      formData.append('address', values.address);
      formData.append('phone', values.phone);
      if (values.logo) {
        formData.append('logo', values.logo);
      }

      const response = await fetch('/api/onboarding/company-info', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to save company info');

      setCompletedSteps([...completedSteps, 1]);
      setCurrentStep(2);
    } catch (err) {
      logger.error('Onboarding company info error', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleParasutSubmit = async (values: ParasutFormValues, skip = false) => {
    if (skip) {
      setCompletedSteps([...completedSteps, 2]);
      setCurrentStep(3);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/onboarding/parasut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error('Failed to save Parasut credentials');

      setCompletedSteps([...completedSteps, 2]);
      setCurrentStep(3);
    } catch (err) {
      logger.error('Onboarding parasut error', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsappSubmit = async (values: WhatsappFormValues, skip = false) => {
    if (skip) {
      setCompletedSteps([...completedSteps, 3]);
      setCurrentStep(4);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/onboarding/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error('Failed to save WhatsApp settings');

      setCompletedSteps([...completedSteps, 3]);
      setCurrentStep(4);
    } catch (err) {
      logger.error('Onboarding whatsapp error', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);

    try {
      const values = parasutForm.getValues();
      const response = await fetch('/api/onboarding/test-parasut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();
      setConnectionResult({
        success: response.ok,
        message: data.message || (response.ok ? 'Connection successful!' : 'Connection failed'),
      });
    } catch (err) {
      setConnectionResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection error',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleCreateFirstQuote = () => {
    router.push(`/${locale}/dashboard`);
  };

  const handleGoToDashboard = () => {
    router.push(`/${locale}/dashboard`);
  };

  if (currentStep === 4) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
        <Confetti />

        <Card className="relative w-full max-w-lg shadow-2xl border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl">
          <div className="p-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur-2xl opacity-50" />
                <div className="relative w-24 h-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>

            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              {t('success.title')}
            </h1>

            <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 max-w-md">
              {t('success.description')}
            </p>

            <div className="space-y-3">
              <Button
                onClick={handleCreateFirstQuote}
                className={primaryBtnClasses}
              >
                <Zap className="w-5 h-5 mr-2" />
                {t('success.createFirstQuote')}
              </Button>

              <Button
                onClick={handleGoToDashboard}
                variant="outline"
                className="w-full h-11 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors duration-200 text-base"
              >
                {t('success.goToDashboard')}
              </Button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-500 mt-8">
              {t('success.note')}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4 py-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-20 animate-pulse" />
      </div>

      <Card className="relative w-full max-w-lg shadow-2xl border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl">
        <div className="p-8">
          <ProgressIndicator
            currentStep={currentStep}
            totalSteps={4}
            completedSteps={completedSteps}
          />

          {/* Step 1: Company Info */}
          <Step isActive={currentStep === 1} isCompleted={completedSteps.includes(1)} stepNumber={1} title={t('step1.title')}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('step1.title')}</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{t('step1.description')}</p>
            </div>

            <Form {...companyForm}>
              <form onSubmit={companyForm.handleSubmit(handleCompanySubmit)} className="space-y-4">
                <FormField
                  control={companyForm.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        {t('step1.companyName')}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Building2 className={iconClasses} />
                          <Input
                            placeholder="Acme Inc."
                            className={inputWithIconClasses}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={companyForm.control}
                  name="taxNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        {t('step1.taxNumber')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="1234567890"
                          className={inputClasses}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={companyForm.control}
                  name="taxOffice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        {t('step1.taxOffice')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Istanbul Tax Office"
                          className={inputClasses}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={companyForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        {t('step1.address')}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <textarea
                            placeholder="123 Business St, Istanbul"
                            className={textareaClasses}
                            rows={3}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={companyForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        {t('step1.phone')}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className={iconClasses} />
                          <Input
                            placeholder="+90 (535) 000 0000"
                            className={inputWithIconClasses}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={companyForm.control}
                  name="logo"
                  render={({ field: { onChange, value: _value, ...field } }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        {t('step1.logo')} ({t('step1.optional')})
                      </FormLabel>
                      <FormControl>
                        <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors duration-200">
                          <div className="flex flex-col items-center justify-center">
                            <Upload className="w-6 h-6 text-gray-400 dark:text-gray-500 mb-2" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              {t('step1.uploadLogo')}
                            </span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              onChange(file);
                            }}
                            {...field}
                          />
                        </label>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isLoading}
                  className={primaryBtnClasses}
                >
                  {isLoading ? t('step1.saving') : t('step1.next')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </Form>
          </Step>

          {/* Step 2: Parasut Integration */}
          <Step isActive={currentStep === 2} isCompleted={completedSteps.includes(2)} stepNumber={2} title={t('step2.title')}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('step2.title')}</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{t('step2.description')}</p>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                  {t('step2.help')}
                </p>
              </div>
            </div>

            {connectionResult && (
              <div
                className={cn(
                  'mb-4 p-3 rounded-xl border flex items-start gap-2',
                  connectionResult.success
                    ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                )}
              >
                {connectionResult.success ? (
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <span className="text-xs">{connectionResult.message}</span>
              </div>
            )}

            <Form {...parasutForm}>
              <form
                onSubmit={parasutForm.handleSubmit((values) => handleParasutSubmit(values, false))}
                className="space-y-4"
              >
                <FormField
                  control={parasutForm.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        {t('step2.companyId')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 123456"
                          className={inputClasses}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={parasutForm.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        {t('step2.clientId')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your API Client ID"
                          className={inputClasses}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={parasutForm.control}
                  name="clientSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        {t('step2.clientSecret')}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className={iconClasses} />
                          <Input
                            type="password"
                            placeholder="••••••••••"
                            className={inputWithIconClasses}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={parasutForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        {t('step2.email')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="user@parasut.com"
                          className={inputClasses}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={parasutForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        {t('step2.password')}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className={iconClasses} />
                          <Input
                            type="password"
                            placeholder="••••••••••"
                            className={inputWithIconClasses}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  variant="outline"
                  className="w-full h-11 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-semibold rounded-xl transition-colors duration-200"
                >
                  {testingConnection ? t('step2.testing') : t('step2.testConnection')}
                </Button>

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={cn(primaryBtnClasses, 'flex-1')}
                  >
                    {isLoading ? t('step2.saving') : t('step2.next')}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleParasutSubmit({}, true)}
                    variant="outline"
                    className="flex-1 h-11 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold rounded-xl transition-colors duration-200"
                  >
                    {t('step2.skip')}
                  </Button>
                </div>
              </form>
            </Form>
          </Step>

          {/* Step 3: WhatsApp Settings */}
          <Step isActive={currentStep === 3} isCompleted={completedSteps.includes(3)} stepNumber={3} title={t('step3.title')}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('step3.title')}</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{t('step3.description')}</p>
            </div>

            <Form {...whatsappForm}>
              <form
                onSubmit={whatsappForm.handleSubmit((values) => handleWhatsappSubmit(values, false))}
                className="space-y-4"
              >
                <FormField
                  control={whatsappForm.control}
                  name="phoneId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        {t('step3.phoneId')}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className={iconClasses} />
                          <Input
                            placeholder="Your WhatsApp Business Phone ID"
                            className={inputWithIconClasses}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={whatsappForm.control}
                  name="accessToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        {t('step3.accessToken')}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <textarea
                            placeholder="Your WhatsApp Business API Access Token"
                            className={cn(textareaClasses, 'font-mono text-xs')}
                            rows={4}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={cn(primaryBtnClasses, 'flex-1')}
                  >
                    {isLoading ? t('step3.saving') : t('step3.next')}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleWhatsappSubmit({}, true)}
                    variant="outline"
                    className="flex-1 h-11 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold rounded-xl transition-colors duration-200"
                  >
                    {t('step3.skip')}
                  </Button>
                </div>
              </form>
            </Form>
          </Step>
        </div>
      </Card>
    </div>
  );
}
