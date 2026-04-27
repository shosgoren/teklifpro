'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUnsavedChanges } from '@/shared/hooks/useUnsavedChanges';
import useSWR from 'swr';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  AlertCircle,
  CheckCircle2,
  Upload,
  Eye,
  EyeOff,
  Plus,
  Users,
  FileText,
  Loader2,
  ImageIcon,
  X,
  Building2,
  CreditCard,
  MessageCircle,
  Settings2,
  UserPlus,
  Shield,
  Zap,
  Crown,
  Star,
  ArrowRight,
  Sparkles,
  Globe,
  Phone,
  Mail,
  MapPin,
  Hash,
  Landmark,
  PenTool,
  Stamp,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type TabKey = 'general' | 'parasut' | 'whatsapp' | 'team' | 'subscription';

const TAB_COLORS: Record<TabKey, { from: string; to: string; shadow: string; light: string; border: string }> = {
  general: { from: 'from-mint-500', to: 'to-mint-600', shadow: 'shadow-mint-500/25', light: 'bg-mint-50 dark:bg-mint-950/30', border: 'border-mint-500' },
  parasut: { from: 'from-emerald-500', to: 'to-teal-600', shadow: 'shadow-emerald-500/25', light: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-500' },
  whatsapp: { from: 'from-green-500', to: 'to-green-600', shadow: 'shadow-green-500/25', light: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-500' },
  team: { from: 'from-violet-500', to: 'to-purple-600', shadow: 'shadow-violet-500/25', light: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-500' },
  subscription: { from: 'from-amber-500', to: 'to-orange-600', shadow: 'shadow-amber-500/25', light: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-500' },
};

const TABS: { key: TabKey; icon: React.ReactNode; descKey: string }[] = [
  { key: 'general', icon: <Building2 className="w-5 h-5" />, descKey: 'tabDescriptions.general' },
  { key: 'parasut', icon: <Settings2 className="w-5 h-5" />, descKey: 'tabDescriptions.parasut' },
  { key: 'whatsapp', icon: <MessageCircle className="w-5 h-5" />, descKey: 'tabDescriptions.whatsapp' },
  { key: 'team', icon: <Users className="w-5 h-5" />, descKey: 'tabDescriptions.team' },
  { key: 'subscription', icon: <CreditCard className="w-5 h-5" />, descKey: 'tabDescriptions.subscription' },
];

const TAB_TRANSLATION_KEYS: Record<TabKey, string> = {
  general: 'tabs.general',
  parasut: 'tabs.parasut',
  whatsapp: 'tabs.whatsapp',
  team: 'tabs.team',
  subscription: 'tabs.billing',
};

const SettingsPage = () => {
  const t = useTranslations('settings');
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [saving, setSaving] = useState(false);
  const { markDirty, markClean } = useUnsavedChanges();
  const [showPasswords, setShowPasswords] = useState({
    parasutPassword: false,
    parasutClientSecret: false,
    whatsappAccessToken: false,
  });

  const { data: authSession } = useSession();
  const session = authSession ? { user: { email: authSession.user?.email || '' } } : null;

  const { data: tenantData, mutate: mutateTenant } = useSWR<{
    success: boolean;
    data: {
      id: string;
      name: string;
      logo: string | null;
      email: string;
      phone: string;
      address: string;
      taxNumber: string;
      taxOffice: string;
      whatsappPhoneId: string | null;
      whatsappAccessToken: string | null;
      whatsappBusinessId: string | null;
      companySignature: string | null;
      companySeal: string | null;
      companySignerName: string | null;
      companySignerTitle: string | null;
    };
  }>('/api/v1/settings/logo', fetcher);

  const [logo, setLogo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [general, setGeneral] = useState({
    companyName: '',
    email: '',
    phone: '',
    address: '',
    taxNumber: '',
    taxOffice: '',
  });

  const [generalErrors, setGeneralErrors] = useState<{ companyName?: string; email?: string }>({});

  interface BankAccount {
    bankName: string;
    branchName: string;
    accountHolder: string;
    iban: string;
    currency: string;
  }

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const [companySignature, setCompanySignature] = useState<string | null>(null);
  const [companySeal, setCompanySeal] = useState<string | null>(null);
  const [companySignerName, setCompanySignerName] = useState('');
  const [companySignerTitle, setCompanySignerTitle] = useState('');
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const sealInputRef = useRef<HTMLInputElement>(null);

  const addBankAccount = () => {
    setBankAccounts([...bankAccounts, { bankName: '', branchName: '', accountHolder: '', iban: '', currency: 'TRY' }]);
  };

  const updateBankAccount = (index: number, field: keyof BankAccount, value: string) => {
    const updated = [...bankAccounts];
    updated[index] = { ...updated[index], [field]: value };
    setBankAccounts(updated);
  };

  const removeBankAccount = (index: number) => {
    setBankAccounts(bankAccounts.filter((_, i) => i !== index));
  };

  const [syncingBank, setSyncingBank] = useState(false);
  const handleSyncBankFromParasut = async () => {
    setSyncingBank(true);
    try {
      const res = await fetch('/api/v1/parasut/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entities: ['bank_accounts'] }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || 'Sync error');
      // Reload tenant data to get updated bank accounts
      await mutateTenant();
      // Re-fetch bank accounts from updated data
      const tenantRes = await fetch('/api/v1/settings/logo');
      const tenantResult = await tenantRes.json();
      if (tenantResult.success && Array.isArray(tenantResult.data?.bankAccounts)) {
        setBankAccounts(tenantResult.data.bankAccounts);
      }
      toast.success(t('bank.syncSuccess', { count: result.data?.bankAccounts?.synced || 0 }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('bank.syncError'));
    } finally {
      setSyncingBank(false);
    }
  };

  const [parasut, setParasut] = useState({
    connected: false,
    companyId: '',
    clientId: '',
    clientSecret: '',
    username: '',
    password: '',
  });

  const [whatsapp, setWhatsapp] = useState({
    connected: false,
    phoneNumberId: '',
    accessToken: '',
    businessAccountId: '',
  });

  const [followup, setFollowup] = useState({
    enabled: false,
    daysAfterView: 3,
    maxReminders: 2,
    message: '',
  });

  useEffect(() => {
    // Load follow-up settings
    fetch('/api/v1/settings/followup')
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setFollowup({
            enabled: res.data.smartFollowupEnabled ?? false,
            daysAfterView: res.data.followupDaysAfterView ?? 3,
            maxReminders: res.data.followupMaxReminders ?? 2,
            message: res.data.followupMessage ?? '',
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tenantData?.success && tenantData.data) {
      const t = tenantData.data;
      setGeneral(prev => ({
        ...prev,
        companyName: t.name || prev.companyName,
        email: t.email || prev.email,
        phone: t.phone || prev.phone,
        address: t.address || prev.address,
        taxNumber: t.taxNumber || prev.taxNumber,
        taxOffice: t.taxOffice || prev.taxOffice,
      }));
      setLogo(t.logo || null);
      setCompanySignature(t.companySignature || null);
      setCompanySeal(t.companySeal || null);
      setCompanySignerName(t.companySignerName || '');
      setCompanySignerTitle(t.companySignerTitle || '');
      const tenantWithBank = t as typeof t & { bankAccounts?: BankAccount[] };
      if (Array.isArray(tenantWithBank.bankAccounts)) {
        setBankAccounts(tenantWithBank.bankAccounts);
      }
      // Load WhatsApp settings
      if (t.whatsappPhoneId) {
        setWhatsapp(prev => ({
          ...prev,
          phoneNumberId: t.whatsappPhoneId || '',
          accessToken: t.whatsappAccessToken || '',
          businessAccountId: t.whatsappBusinessId || '',
          connected: !!(t.whatsappPhoneId && t.whatsappAccessToken),
        }));
      }
    }
  }, [tenantData]);

  useEffect(() => {
    if (session?.user && !tenantData?.data?.email) {
      setGeneral(prev => ({
        ...prev,
        email: prev.email || session.user!.email || '',
      }));
    }
  }, [session, tenantData]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast.error(t('brand.fileTooLarge'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error(t('esignature.fileTooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSignatureSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/settings/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companySignature,
          companySeal,
          companySignerName,
          companySignerTitle,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      await mutateTenant();
      markClean();
      toast.success(t('esignature.saved'));
    } catch {
      toast.error(t('esignature.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const validateGeneral = useCallback(() => {
    const errors: { companyName?: string; email?: string } = {};
    if (!general.companyName.trim()) {
      errors.companyName = t('validation.companyNameRequired');
    }
    if (general.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(general.email.trim())) {
      errors.email = t('validation.emailInvalid');
    }
    setGeneralErrors(errors);
    return Object.keys(errors).length === 0;
  }, [general.companyName, general.email, t]);

  const handleGeneralSave = async () => {
    if (!validateGeneral()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/v1/settings/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo,
          name: general.companyName,
          phone: general.phone,
          address: general.address,
          taxNumber: general.taxNumber,
          taxOffice: general.taxOffice,
          bankAccounts: bankAccounts.filter(b => b.bankName && b.iban),
        }),
      });

      if (!res.ok) throw new Error('Save failed');

      await mutateTenant();
      markClean();
      toast.success(t('saved'));
    } catch {
      toast.error(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleParasutSave = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      markClean();
      toast.success(t('saved'));
    } finally {
      setSaving(false);
    }
  };

  const handleWhatsAppSave = async () => {
    setSaving(true);
    try {
      // Don't send masked token back — only send if user entered a new one
      const isMaskedToken = whatsapp.accessToken.startsWith('•');
      const payload: Record<string, string> = {
        phoneId: whatsapp.phoneNumberId,
        businessAccountId: whatsapp.businessAccountId,
      };
      if (!isMaskedToken && whatsapp.accessToken) {
        payload.accessToken = whatsapp.accessToken;
      }

      const res = await fetch('/api/onboarding/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || 'Save error');
      setWhatsapp({ ...whatsapp, connected: true });
      markClean();
      toast.success(t('whatsapp.saved'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('whatsapp.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleFollowupSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/settings/followup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smartFollowupEnabled: followup.enabled,
          followupDaysAfterView: followup.daysAfterView,
          followupMessage: followup.message || null,
          followupMaxReminders: followup.maxReminders,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || t('followupError'));
      markClean();
      toast.success(t('followupSaved'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('followupError'));
    } finally {
      setSaving(false);
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const colors = TAB_COLORS[activeTab];

  const inputClass =
    'h-11 rounded-xl bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-mint-500/20 focus:border-mint-400 transition-all text-sm';

  if (!session) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="bg-gradient-to-br from-mint-600 via-mint-600 to-violet-700 px-4 pb-8 md:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="h-8 w-48 bg-white/20 animate-pulse rounded-xl mb-2" />
            <div className="h-4 w-72 bg-white/10 animate-pulse rounded-lg" />
          </div>
        </div>
        <div className="bg-gray-50/50 dark:bg-gray-950">
          <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-6">
            <div className="flex gap-3 overflow-x-auto pb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 w-28 bg-white dark:bg-gray-900 animate-pulse rounded-2xl shrink-0" />
              ))}
            </div>
            <div className="h-72 bg-white dark:bg-gray-900 animate-pulse rounded-2xl mt-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto" onInput={markDirty} onChange={markDirty}>
      {/* ========== Gradient Background + Tabs ========== */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${colors.from} ${colors.to} pb-8 md:pb-14 px-4 md:px-8`}>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-white/3 rounded-full -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="bg-gray-50/50 dark:bg-gray-950">
      {/* ========== Tab Navigation ========== */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-6 md:-mt-12">
        <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-2 scrollbar-hide" role="tablist" aria-label={t('settingsTabs')}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const tabColor = TAB_COLORS[tab.key];
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.key}`}
                id={`tab-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-1.5 md:gap-2.5 px-3 py-2.5 md:px-5 md:py-3.5 transition-all duration-300 shrink-0 rounded-xl md:rounded-2xl font-medium text-xs md:text-sm
                  ${isActive
                    ? `bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xl ring-2 ring-offset-1 md:ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-950 ${tabColor.border.replace('border-', 'ring-')}`
                    : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-900 hover:shadow-lg hover:text-gray-700'
                  }`}
              >
                <span className={isActive ? `bg-gradient-to-br ${tabColor.from} ${tabColor.to} text-white p-1 md:p-1.5 rounded-md md:rounded-lg` : 'p-1 md:p-1.5'}>
                  {tab.icon}
                </span>
                <div className="text-left">
                  <span className="block font-semibold text-[11px] md:text-sm">{t(TAB_TRANSLATION_KEYS[tab.key] as Parameters<typeof t>[0])}</span>
                  <span className={`block text-[10px] leading-tight hidden md:block ${isActive ? 'text-gray-400' : 'text-gray-400/70'}`}>
                    {t(tab.descKey as Parameters<typeof t>[0])}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========== Tab Content ========== */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">

        {/* ===== General Tab ===== */}
        {activeTab === 'general' && (
          <div className="space-y-6" role="tabpanel" id="tabpanel-general" aria-labelledby="tab-general">
            {/* Logo & Brand Card */}
            <div className="rounded-2xl shadow-xl bg-white dark:bg-gray-900 overflow-hidden">
              <div className={`h-1.5 bg-gradient-to-r ${colors.from} ${colors.to}`} />
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to}`}>
                    <ImageIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('brand.title')}</h3>
                    <p className="text-xs text-gray-400">{t('brand.desc')}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-mint-50/30 dark:from-gray-800/50 dark:to-mint-950/20 border border-gray-100 dark:border-gray-800">
                  {/* Logo Preview */}
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-mint-300 dark:border-mint-700 bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden transition-all group-hover:border-mint-400 group-hover:shadow-lg">
                      {logo ? (
                        <img src={logo} alt="Logo" className="w-full h-full object-contain p-3" />
                      ) : (
                        <div className="text-center">
                          <ImageIcon className="w-10 h-10 text-mint-200 dark:text-mint-800 mx-auto mb-1" />
                          <span className="text-[10px] text-gray-400">{t('brand.noLogo')}</span>
                        </div>
                      )}
                    </div>
                    {logo && (
                      <button
                        onClick={() => setLogo(null)}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Upload Area */}
                  <div className="flex-1 text-center sm:text-left">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoSelect}
                    />
                    <button
                      className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${colors.from} ${colors.to} text-white font-semibold rounded-xl hover:opacity-90 shadow-lg ${colors.shadow} transition-all text-sm`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4" />
                      {t('brand.upload')}
                    </button>
                    <p className="text-xs text-gray-400 mt-3">{t('brand.fileHint')}</p>
                    <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">{t('brand.sizeHint')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Info Card */}
            <div className="rounded-2xl shadow-xl bg-white dark:bg-gray-900 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-mint-500 via-mint-500 to-cyan-500" />
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-mint-500 to-mint-600">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('company.title')}</h3>
                    <p className="text-xs text-gray-400">{t('company.desc')}</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="company-name" className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" /> {t('company.name')}
                      </Label>
                      <Input
                        id="company-name"
                        className={inputClass}
                        value={general.companyName}
                        onChange={e => { setGeneral({ ...general, companyName: e.target.value }); if (generalErrors.companyName) setGeneralErrors(prev => ({ ...prev, companyName: undefined })); }}
                        placeholder={t('placeholders.companyName')}
                        aria-invalid={!!generalErrors.companyName}
                      />
                      {generalErrors.companyName && <p className="text-xs text-red-500 mt-1">{generalErrors.companyName}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> {t('company.email')}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        className={inputClass}
                        value={general.email}
                        onChange={e => { setGeneral({ ...general, email: e.target.value }); if (generalErrors.email) setGeneralErrors(prev => ({ ...prev, email: undefined })); }}
                        placeholder={t('placeholders.email')}
                        aria-invalid={!!generalErrors.email}
                      />
                      {generalErrors.email && <p className="text-xs text-red-500 mt-1">{generalErrors.email}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> {t('company.phone')}
                      </Label>
                      <Input
                        id="phone"
                        className={inputClass}
                        value={general.phone}
                        onChange={e => setGeneral({ ...general, phone: e.target.value })}
                        placeholder={t('placeholders.phone')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax-number" className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5" /> {t('company.taxNumber')}
                      </Label>
                      <Input
                        id="tax-number"
                        className={inputClass}
                        value={general.taxNumber}
                        onChange={e => setGeneral({ ...general, taxNumber: e.target.value })}
                        placeholder={t('placeholders.taxNumber')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax-office" className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5" /> {t('company.taxOffice')}
                    </Label>
                    <Input
                      id="tax-office"
                      className={inputClass}
                      value={general.taxOffice}
                      onChange={e => setGeneral({ ...general, taxOffice: e.target.value })}
                      placeholder={t('placeholders.taxOffice')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> {t('company.address')}
                    </Label>
                    <Input
                      id="address"
                      className={inputClass}
                      value={general.address}
                      onChange={e => setGeneral({ ...general, address: e.target.value })}
                      placeholder={t('placeholders.address')}
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={handleGeneralSave}
                      disabled={saving}
                      className={`inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r ${colors.from} ${colors.to} text-white font-semibold rounded-xl hover:opacity-90 shadow-lg ${colors.shadow} disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm`}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {t('saveChanges')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Accounts */}
            <div className="rounded-2xl shadow-xl bg-white dark:bg-gray-900 overflow-hidden">
              <div className={`h-1.5 bg-gradient-to-r ${colors.from} ${colors.to}`} />
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to}`}>
                      <Landmark className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('bank.title')}</h3>
                      <p className="text-xs text-gray-400">{t('bank.desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {parasut.connected && (
                      <button
                        onClick={handleSyncBankFromParasut}
                        disabled={syncingBank}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs border border-emerald-200 dark:border-emerald-800 disabled:opacity-50"
                      >
                        {syncingBank ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings2 className="w-3.5 h-3.5" />}
                        {t('bank.syncParasut')}
                      </button>
                    )}
                    <button
                      onClick={addBankAccount}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r ${colors.from} ${colors.to} text-white font-medium rounded-xl hover:opacity-90 text-xs shadow-md`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t('bank.add')}
                    </button>
                  </div>
                </div>

                {bankAccounts.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <div className="w-16 h-16 bg-mint-50 dark:bg-mint-950/30 rounded-2xl flex items-center justify-center mb-3">
                      <Landmark className="w-8 h-8 text-mint-400" />
                    </div>
                    <p className="text-sm text-gray-400">{t('bank.empty')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bankAccounts.map((bank, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('bank.account')} #{idx + 1}</span>
                          <button
                            onClick={() => removeBankAccount(idx)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('bank.bankName')}</Label>
                            <Input className={inputClass} value={bank.bankName} onChange={e => updateBankAccount(idx, 'bankName', e.target.value)} placeholder={t('placeholders.bankName')} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('bank.branchName')}</Label>
                            <Input className={inputClass} value={bank.branchName} onChange={e => updateBankAccount(idx, 'branchName', e.target.value)} placeholder={t('placeholders.branchName')} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('bank.accountHolder')}</Label>
                          <Input className={inputClass} value={bank.accountHolder} onChange={e => updateBankAccount(idx, 'accountHolder', e.target.value)} placeholder={t('placeholders.accountHolder')} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">IBAN</Label>
                          <Input className={inputClass} value={bank.iban} onChange={e => updateBankAccount(idx, 'iban', e.target.value.toUpperCase())} placeholder={t('placeholders.iban')} maxLength={34} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('bank.currency')}</Label>
                          <select
                            className={`${inputClass} w-full px-3`}
                            value={bank.currency}
                            onChange={e => updateBankAccount(idx, 'currency', e.target.value)}
                          >
                            <option value="TRY">{t('currency.TRY')}</option>
                            <option value="USD">{t('currency.USD')}</option>
                            <option value="EUR">{t('currency.EUR')}</option>
                            <option value="GBP">{t('currency.GBP')}</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {bankAccounts.length > 0 && (
                  <div className="flex justify-end pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={handleGeneralSave}
                      disabled={saving}
                      className={`inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r ${colors.from} ${colors.to} text-white font-semibold rounded-xl hover:opacity-90 shadow-lg ${colors.shadow} disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm`}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {t('bank.save')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* E-İmza & Kaşe Card */}
            <div className="rounded-2xl shadow-xl bg-white dark:bg-gray-900 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-600" />
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                    <PenTool className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('esignature.title')}</h3>
                    <p className="text-xs text-gray-400">{t('esignature.desc')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-l-4 border-emerald-400 mb-6">
                  <Shield className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    {t('esignature.securityNote')}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  {/* Company Signature Upload */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <PenTool className="w-3.5 h-3.5" /> {t('esignature.companySignature')}
                    </Label>
                    <div className="relative group">
                      <div className="w-full h-32 rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden transition-all group-hover:border-emerald-400 group-hover:shadow-lg">
                        {companySignature ? (
                          <img src={companySignature} alt={t('esignature.companySignature')} className="w-full h-full object-contain p-3" />
                        ) : (
                          <div className="text-center">
                            <PenTool className="w-8 h-8 text-emerald-200 dark:text-emerald-800 mx-auto mb-1" />
                            <span className="text-[10px] text-gray-400">{t('esignature.noSignature')}</span>
                          </div>
                        )}
                      </div>
                      {companySignature && (
                        <button
                          onClick={() => setCompanySignature(null)}
                          className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input ref={signatureInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageSelect(e, setCompanySignature)} />
                    <button
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl hover:opacity-90 shadow-md text-xs"
                      onClick={() => signatureInputRef.current?.click()}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {t('esignature.uploadSignature')}
                    </button>
                    <p className="text-[10px] text-gray-400">{t('esignature.imageHint')}</p>
                  </div>

                  {/* Company Seal Upload */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Stamp className="w-3.5 h-3.5" /> {t('esignature.companySeal')}
                    </Label>
                    <div className="relative group">
                      <div className="w-full h-32 rounded-xl border-2 border-dashed border-teal-300 dark:border-teal-700 bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden transition-all group-hover:border-teal-400 group-hover:shadow-lg">
                        {companySeal ? (
                          <img src={companySeal} alt={t('esignature.companySeal')} className="w-full h-full object-contain p-3" />
                        ) : (
                          <div className="text-center">
                            <Stamp className="w-8 h-8 text-teal-200 dark:text-teal-800 mx-auto mb-1" />
                            <span className="text-[10px] text-gray-400">{t('esignature.noSeal')}</span>
                          </div>
                        )}
                      </div>
                      {companySeal && (
                        <button
                          onClick={() => setCompanySeal(null)}
                          className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input ref={sealInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageSelect(e, setCompanySeal)} />
                    <button
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-medium rounded-xl hover:opacity-90 shadow-md text-xs"
                      onClick={() => sealInputRef.current?.click()}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {t('esignature.uploadSeal')}
                    </button>
                    <p className="text-[10px] text-gray-400">{t('esignature.imageHint')}</p>
                  </div>
                </div>

                {/* Signer Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor="signer-name" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('esignature.signerName')}</Label>
                    <Input
                      id="signer-name"
                      className={inputClass}
                      value={companySignerName}
                      onChange={e => setCompanySignerName(e.target.value)}
                      placeholder={t('placeholders.signerName')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signer-title" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('esignature.signerTitle')}</Label>
                    <Input
                      id="signer-title"
                      className={inputClass}
                      value={companySignerTitle}
                      onChange={e => setCompanySignerTitle(e.target.value)}
                      placeholder={t('placeholders.signerTitle')}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={handleSignatureSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:opacity-90 shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {t('esignature.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== Parasut Tab ===== */}
        {activeTab === 'parasut' && (
          <div className="rounded-2xl shadow-xl bg-white dark:bg-gray-900 overflow-hidden" role="tabpanel" id="tabpanel-parasut" aria-labelledby="tab-parasut">
            <div className={`h-1.5 bg-gradient-to-r ${colors.from} ${colors.to}`} />
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to}`}>
                    <Settings2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('parasut.title')}</h3>
                    <p className="text-xs text-gray-400">{t('parasut.desc')}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all
                    ${parasut.connected
                      ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}
                >
                  {parasut.connected ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {parasut.connected ? t('parasut.connected') : t('parasut.disconnected')}
                </span>
              </div>

              <div className="space-y-5">
                {!parasut.connected && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-l-4 border-amber-400">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {t('parasut.notConnectedWarning')}
                    </p>
                  </div>
                )}

                {parasut.connected && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-l-4 border-green-400">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-green-700 dark:text-green-300">{t('parasut.connectedInfo')}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="company-id" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('parasut.companyId')}</Label>
                    <Input id="company-id" className={inputClass} value={parasut.companyId} onChange={e => setParasut({ ...parasut, companyId: e.target.value })} placeholder={t('placeholders.parasutCompanyId')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-id" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('parasut.clientId')}</Label>
                    <Input id="client-id" className={inputClass} value={parasut.clientId} onChange={e => setParasut({ ...parasut, clientId: e.target.value })} placeholder={t('placeholders.parasutClientId')} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-secret" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('parasut.clientSecret')}</Label>
                  <div className="flex items-center gap-2">
                    <Input id="client-secret" className={inputClass + ' flex-1'} type={showPasswords.parasutClientSecret ? 'text' : 'password'} value={parasut.clientSecret} onChange={e => setParasut({ ...parasut, clientSecret: e.target.value })} placeholder={t('placeholders.parasutClientSecret')} />
                    <button className="p-2.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" onClick={() => togglePasswordVisibility('parasutClientSecret')}>
                      {showPasswords.parasutClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('parasut.username')}</Label>
                    <Input id="username" className={inputClass} value={parasut.username} onChange={e => setParasut({ ...parasut, username: e.target.value })} placeholder={t('placeholders.parasutUsername')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('parasut.password')}</Label>
                    <div className="flex items-center gap-2">
                      <Input id="password" className={inputClass + ' flex-1'} type={showPasswords.parasutPassword ? 'text' : 'password'} value={parasut.password} onChange={e => setParasut({ ...parasut, password: e.target.value })} placeholder={t('placeholders.parasutPassword')} />
                      <button className="p-2.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" onClick={() => togglePasswordVisibility('parasutPassword')}>
                        {showPasswords.parasutPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-mint-50 to-mint-50 dark:from-mint-950/20 dark:to-mint-950/20 border-l-4 border-mint-400">
                  <Globe className="w-5 h-5 text-mint-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-mint-700 dark:text-mint-300 mb-2">{t('parasut.credentialsHint')}</p>
                    <ul className="text-sm space-y-1">
                      <li><a href="https://api.parasut.com" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline text-mint-600">{t('parasut.apiInfo')}</a></li>
                      <li><a href="https://api.parasut.com" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline text-mint-600">{t('parasut.oauthSettings')}</a></li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button onClick={handleParasutSave} disabled={saving} className={`inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r ${colors.from} ${colors.to} text-white font-semibold rounded-xl hover:opacity-90 shadow-lg ${colors.shadow} disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm`}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {t('saveChanges')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== WhatsApp Tab ===== */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6" role="tabpanel" id="tabpanel-whatsapp" aria-labelledby="tab-whatsapp">
          <div className="rounded-2xl shadow-xl bg-white dark:bg-gray-900 overflow-hidden">
            <div className={`h-1.5 bg-gradient-to-r ${colors.from} ${colors.to}`} />
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to}`}>
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('whatsapp.title')}</h3>
                    <p className="text-xs text-gray-400">{t('whatsapp.desc')}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold
                    ${whatsapp.connected
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}
                >
                  {whatsapp.connected ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {whatsapp.connected ? t('whatsapp.connected') : t('whatsapp.disconnected')}
                </span>
              </div>

              <div className="space-y-5">
                {!whatsapp.connected && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-l-4 border-amber-400">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">{t('whatsapp.notConnectedWarning')}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="phone-number-id" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('whatsapp.phoneNumberId')}</Label>
                  <Input id="phone-number-id" className={inputClass} value={whatsapp.phoneNumberId} onChange={e => setWhatsapp({ ...whatsapp, phoneNumberId: e.target.value })} placeholder={t('placeholders.whatsappPhoneId')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="access-token" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('whatsapp.accessToken')}</Label>
                  <div className="flex items-center gap-2">
                    <Input id="access-token" className={inputClass + ' flex-1'} type={showPasswords.whatsappAccessToken ? 'text' : 'password'} value={whatsapp.accessToken} onChange={e => setWhatsapp({ ...whatsapp, accessToken: e.target.value })} placeholder={t('placeholders.whatsappAccessToken')} />
                    <button className="p-2.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" onClick={() => togglePasswordVisibility('whatsappAccessToken')}>
                      {showPasswords.whatsappAccessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-account-id" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('whatsapp.businessAccountId')}</Label>
                  <Input id="business-account-id" className={inputClass} value={whatsapp.businessAccountId} onChange={e => setWhatsapp({ ...whatsapp, businessAccountId: e.target.value })} placeholder={t('placeholders.whatsappBusinessId')} />
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button onClick={handleWhatsAppSave} disabled={saving} className={`inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r ${colors.from} ${colors.to} text-white font-semibold rounded-xl hover:opacity-90 shadow-lg ${colors.shadow} disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm`}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {t('saveChanges')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Smart Follow-up Section */}
          <div className="rounded-2xl shadow-xl bg-white dark:bg-gray-900 overflow-hidden">
            <div className={`h-1.5 bg-gradient-to-r ${colors.from} ${colors.to}`} />
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to}`}>
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('followup.title')}</h3>
                  <p className="text-xs text-gray-400">{t('followup.desc')}</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Enable toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{t('followup.enable')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t('followup.enableDesc')}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={followup.enabled}
                    onClick={() => setFollowup({ ...followup, enabled: !followup.enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${followup.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${followup.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {followup.enabled && (
                  <>
                    {/* Days after view */}
                    <div className="space-y-2">
                      <Label htmlFor="followup-days" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('followup.daysLabel')}</Label>
                      <Input
                        id="followup-days"
                        type="number"
                        min={1}
                        max={30}
                        className={inputClass}
                        value={followup.daysAfterView}
                        onChange={e => setFollowup({ ...followup, daysAfterView: Math.min(30, Math.max(1, parseInt(e.target.value) || 1)) })}
                      />
                      <p className="text-xs text-gray-400">{t('followup.daysHint')}</p>
                    </div>

                    {/* Max reminders */}
                    <div className="space-y-2">
                      <Label htmlFor="followup-max" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('followup.maxLabel')}</Label>
                      <Input
                        id="followup-max"
                        type="number"
                        min={1}
                        max={5}
                        className={inputClass}
                        value={followup.maxReminders}
                        onChange={e => setFollowup({ ...followup, maxReminders: Math.min(5, Math.max(1, parseInt(e.target.value) || 1)) })}
                      />
                      <p className="text-xs text-gray-400">{t('followup.maxHint')}</p>
                    </div>

                    {/* Custom message */}
                    <div className="space-y-2">
                      <Label htmlFor="followup-message" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('followup.messageLabel')}</Label>
                      <textarea
                        id="followup-message"
                        rows={4}
                        maxLength={1000}
                        className={`${inputClass} w-full p-3 resize-none`}
                        value={followup.message}
                        onChange={e => setFollowup({ ...followup, message: e.target.value })}
                        placeholder={t('followup.messagePlaceholder')}
                      />
                      <p className="text-xs text-gray-400">
                        {t('followup.messageHint')}: {'{{customerName}}'}, {'{{proposalTitle}}'}, {'{{proposalNumber}}'}, {'{{daysLeft}}'}, {'{{proposalUrl}}'}, {'{{companyName}}'}
                      </p>
                    </div>
                  </>
                )}

                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button onClick={handleFollowupSave} disabled={saving} className={`inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r ${colors.from} ${colors.to} text-white font-semibold rounded-xl hover:opacity-90 shadow-lg ${colors.shadow} disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm`}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {t('followup.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* ===== Team Tab ===== */}
        {activeTab === 'team' && (
          <div className="rounded-2xl shadow-xl bg-white dark:bg-gray-900 overflow-hidden" role="tabpanel" id="tabpanel-team" aria-labelledby="tab-team">
            <div className={`h-1.5 bg-gradient-to-r ${colors.from} ${colors.to}`} />
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to}`}>
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('team.title')}</h3>
                  <p className="text-xs text-gray-400">{t('team.desc')}</p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="relative mb-8">
                  <div className="w-28 h-28 bg-gradient-to-br from-violet-100 to-purple-200 dark:from-violet-950/40 dark:to-purple-950/40 rounded-3xl flex items-center justify-center">
                    <UserPlus className="w-14 h-14 text-violet-500 dark:text-violet-400" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('team.emptyTitle')}</p>
                <p className="text-sm text-gray-400 mb-8 max-w-sm">
                  {t('team.emptyDesc')}
                </p>
                <button className={`inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r ${colors.from} ${colors.to} text-white font-semibold rounded-xl hover:opacity-90 shadow-lg ${colors.shadow} transition-all text-sm`}>
                  <UserPlus className="w-4 h-4" />
                  {t('team.addMember')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== Subscription Tab ===== */}
        {activeTab === 'subscription' && (
          <div className="space-y-6" role="tabpanel" id="tabpanel-subscription" aria-labelledby="tab-subscription">
            {/* Current Plan */}
            <div className="rounded-2xl shadow-xl bg-white dark:bg-gray-900 overflow-hidden">
              <div className={`h-1.5 bg-gradient-to-r ${colors.from} ${colors.to}`} />
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to}`}>
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('subscription.title')}</h3>
                    <p className="text-xs text-gray-400">{t('subscription.desc')}</p>
                  </div>
                </div>

                {/* Current Plan Badge */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-yellow-950/20 border border-amber-200 dark:border-amber-800 gap-4 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25">
                      <Zap className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">{t('subscription.currentPlan')}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('subscription.free')}</p>
                    </div>
                  </div>
                  <button className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:opacity-90 shadow-lg shadow-amber-500/25 transition-all text-sm flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    {t('subscription.upgradePlan')}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Plan Comparison */}
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  {t('subscription.planComparison')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Starter */}
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900 hover:shadow-lg transition-all group">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                        <Zap className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('subscription.starter')}</h5>
                        <p className="text-xs text-gray-400">{t('subscription.starterDesc')}</p>
                      </div>
                    </div>
                    <ul className="space-y-3">
                      {['subscription.features.proposals50', 'subscription.features.teamMember1', 'subscription.features.parasutIntegration'].map(key => (
                        <li key={key} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                          {t(key as Parameters<typeof t>[0])}
                        </li>
                      ))}
                      <li className="flex items-center gap-3 text-sm text-gray-300 dark:text-gray-600">
                        <X className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0" />
                        {t('subscription.features.whatsappIntegration')}
                      </li>
                    </ul>
                  </div>

                  {/* Professional */}
                  <div className="relative rounded-2xl border-2 border-mint-500 p-6 bg-gradient-to-br from-mint-50/80 to-mint-50/80 dark:from-mint-950/30 dark:to-mint-950/30 shadow-xl shadow-mint-500/10">
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-mint-600 to-mint-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg">
                      <Star className="w-3 h-3 inline mr-1 -mt-0.5" />
                      {t('subscription.recommended')}
                    </span>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 bg-gradient-to-br from-mint-500 to-mint-600 rounded-xl flex items-center justify-center shadow-lg shadow-mint-500/25">
                        <Crown className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('subscription.professional')}</h5>
                        <p className="text-xs text-gray-400">{t('subscription.professionalDesc')}</p>
                      </div>
                    </div>
                    <ul className="space-y-3">
                      {['subscription.features.unlimitedProposals', 'subscription.features.teamMembers5', 'subscription.features.parasutIntegration', 'subscription.features.whatsappIntegration'].map(key => (
                        <li key={key} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                          {t(key as Parameters<typeof t>[0])}
                        </li>
                      ))}
                    </ul>
                    <button className="w-full mt-6 py-3 bg-gradient-to-r from-mint-600 to-mint-600 text-white font-semibold rounded-xl hover:opacity-90 shadow-lg shadow-mint-500/25 transition-all text-sm flex items-center justify-center gap-2">
                      {t('subscription.upgradeToPro')}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div className="rounded-2xl shadow-xl bg-white dark:bg-gray-900 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500" />
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-gray-400 to-gray-600">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('subscription.paymentHistory')}</h3>
                </div>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mb-5">
                    <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{t('subscription.noInvoices')}</p>
                  <p className="text-sm text-gray-400 max-w-sm">
                    {t('subscription.noInvoicesDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default SettingsPage;
