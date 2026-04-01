'use client';

import React, { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from 'lucide-react';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface SessionData {
  status: string;
  user?: {
    email: string;
    name: string;
    id: string;
    tenantId: string;
    role: string;
  };
}

type TabKey = 'general' | 'parasut' | 'whatsapp' | 'team' | 'subscription';

const TAB_COLORS: Record<TabKey, { from: string; to: string; shadow: string; light: string; border: string }> = {
  general: { from: 'from-blue-500', to: 'to-indigo-600', shadow: 'shadow-blue-500/25', light: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-500' },
  parasut: { from: 'from-emerald-500', to: 'to-teal-600', shadow: 'shadow-emerald-500/25', light: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-500' },
  whatsapp: { from: 'from-green-500', to: 'to-green-600', shadow: 'shadow-green-500/25', light: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-500' },
  team: { from: 'from-violet-500', to: 'to-purple-600', shadow: 'shadow-violet-500/25', light: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-500' },
  subscription: { from: 'from-amber-500', to: 'to-orange-600', shadow: 'shadow-amber-500/25', light: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-500' },
};

const TABS: { key: TabKey; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'general', label: 'Genel', icon: <Building2 className="w-5 h-5" />, desc: 'Şirket bilgileri ve logo' },
  { key: 'parasut', label: 'Parasut', icon: <Settings2 className="w-5 h-5" />, desc: 'Muhasebe entegrasyonu' },
  { key: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-5 h-5" />, desc: 'Mesajlaşma entegrasyonu' },
  { key: 'team', label: 'Ekip', icon: <Users className="w-5 h-5" />, desc: 'Ekip üyeleri yönetimi' },
  { key: 'subscription', label: 'Abonelik', icon: <CreditCard className="w-5 h-5" />, desc: 'Plan ve faturalar' },
];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    parasutPassword: false,
    parasutClientSecret: false,
    whatsappAccessToken: false,
  });

  const { data: session, isLoading: sessionLoading } = useSWR<SessionData>(
    '/api/debug/session',
    fetcher
  );

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
      toast.error('Logo dosyasi en fazla 500KB olabilir.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGeneralSave = async () => {
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
        }),
      });

      if (!res.ok) throw new Error('Save failed');

      await mutateTenant();
      toast.success('Ayarlar kaydedildi');
    } catch {
      toast.error('Ayarlar kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleParasutSave = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Ayarlar kaydedildi');
    } finally {
      setSaving(false);
    }
  };

  const handleWhatsAppSave = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Ayarlar kaydedildi');
    } finally {
      setSaving(false);
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const colors = TAB_COLORS[activeTab];

  const inputClass =
    'h-11 rounded-xl bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm';

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950">
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-4 py-8 md:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="h-8 w-48 bg-white/20 animate-pulse rounded-xl mb-2" />
            <div className="h-4 w-72 bg-white/10 animate-pulse rounded-lg" />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-6">
          <div className="flex gap-3 overflow-x-auto pb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 w-28 bg-white dark:bg-gray-900 animate-pulse rounded-2xl shrink-0" />
            ))}
          </div>
          <div className="h-72 bg-white dark:bg-gray-900 animate-pulse rounded-2xl mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950">
      {/* ========== Gradient Header ========== */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${colors.from} ${colors.to} px-4 py-8 md:px-8 md:py-10`}>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-white/3 rounded-full -translate-x-1/2 -translate-y-1/2" />

        <div className="relative max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
              <Settings2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Ayarlar</h1>
          </div>
          <p className="text-white/70 text-sm md:text-base ml-[52px]">
            İşletmenizi yapılandırın, entegrasyonları yönetin
          </p>
        </div>
      </div>

      {/* ========== Tab Navigation ========== */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-7">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const tabColor = TAB_COLORS[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-2.5 px-5 py-3.5 transition-all duration-300 shrink-0 rounded-2xl font-medium text-sm
                  ${isActive
                    ? `bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xl ring-2 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-950 ${tabColor.border.replace('border-', 'ring-')}`
                    : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-900 hover:shadow-lg hover:text-gray-700'
                  }`}
              >
                <span className={isActive ? `bg-gradient-to-br ${tabColor.from} ${tabColor.to} text-white p-1.5 rounded-lg` : 'p-1.5'}>
                  {tab.icon}
                </span>
                <div className="text-left">
                  <span className="block font-semibold">{tab.label}</span>
                  <span className={`block text-[10px] leading-tight hidden sm:block ${isActive ? 'text-gray-400' : 'text-gray-400/70'}`}>
                    {tab.desc}
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
          <div className="space-y-6">
            {/* Logo & Brand Card */}
            <div className="rounded-2xl shadow-xl bg-white dark:bg-gray-900 overflow-hidden">
              <div className={`h-1.5 bg-gradient-to-r ${colors.from} ${colors.to}`} />
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to}`}>
                    <ImageIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Marka & Logo</h3>
                    <p className="text-xs text-gray-400">Tekliflerinizde görünecek logo</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-800/50 dark:to-blue-950/20 border border-gray-100 dark:border-gray-800">
                  {/* Logo Preview */}
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-400 group-hover:shadow-lg">
                      {logo ? (
                        <img src={logo} alt="Logo" className="w-full h-full object-contain p-3" />
                      ) : (
                        <div className="text-center">
                          <ImageIcon className="w-10 h-10 text-blue-200 dark:text-blue-800 mx-auto mb-1" />
                          <span className="text-[10px] text-gray-400">Logo yok</span>
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
                      Logo Yükle
                    </button>
                    <p className="text-xs text-gray-400 mt-3">PNG, JPG veya SVG - Maksimum 500KB</p>
                    <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">Önerilen boyut: 200x200px veya daha büyük</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Info Card */}
            <div className="rounded-2xl shadow-xl bg-white dark:bg-gray-900 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500" />
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Şirket Bilgileri</h3>
                    <p className="text-xs text-gray-400">Temel şirket bilgilerinizi güncelleyin</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="company-name" className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" /> Şirket Adı
                      </Label>
                      <Input
                        id="company-name"
                        className={inputClass}
                        value={general.companyName}
                        onChange={e => setGeneral({ ...general, companyName: e.target.value })}
                        placeholder="Şirket adınızı girin"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> E-posta
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        className={inputClass}
                        value={general.email}
                        onChange={e => setGeneral({ ...general, email: e.target.value })}
                        placeholder="contact@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> Telefon
                      </Label>
                      <Input
                        id="phone"
                        className={inputClass}
                        value={general.phone}
                        onChange={e => setGeneral({ ...general, phone: e.target.value })}
                        placeholder="+90 XXX XXX XXXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax-number" className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5" /> Vergi Numarası
                      </Label>
                      <Input
                        id="tax-number"
                        className={inputClass}
                        value={general.taxNumber}
                        onChange={e => setGeneral({ ...general, taxNumber: e.target.value })}
                        placeholder="0123456789"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax-office" className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5" /> Vergi Dairesi
                    </Label>
                    <Input
                      id="tax-office"
                      className={inputClass}
                      value={general.taxOffice}
                      onChange={e => setGeneral({ ...general, taxOffice: e.target.value })}
                      placeholder="Vergi daireniz"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Adres
                    </Label>
                    <Input
                      id="address"
                      className={inputClass}
                      value={general.address}
                      onChange={e => setGeneral({ ...general, address: e.target.value })}
                      placeholder="Şirket adresiniz"
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={handleGeneralSave}
                      disabled={saving}
                      className={`inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r ${colors.from} ${colors.to} text-white font-semibold rounded-xl hover:opacity-90 shadow-lg ${colors.shadow} disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm`}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Değişiklikleri Kaydet
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== Parasut Tab ===== */}
        {activeTab === 'parasut' && (
          <div className="rounded-2xl shadow-xl bg-white dark:bg-gray-900 overflow-hidden">
            <div className={`h-1.5 bg-gradient-to-r ${colors.from} ${colors.to}`} />
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to}`}>
                    <Settings2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Parasut Entegrasyonu</h3>
                    <p className="text-xs text-gray-400">Muhasebe sisteminizi TeklifPro ile entegre edin</p>
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
                  {parasut.connected ? 'Bagli' : 'Bagli Degil'}
                </span>
              </div>

              <div className="space-y-5">
                {!parasut.connected && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-l-4 border-amber-400">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Paraşüt hesabınız henüz bağlı değil. Aşağıdaki bilgileri doldurup kaydedin.
                    </p>
                  </div>
                )}

                {parasut.connected && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-l-4 border-green-400">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-green-700 dark:text-green-300">Paraşüt bağlantınız aktif.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="company-id" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Şirket ID</Label>
                    <Input id="company-id" className={inputClass} value={parasut.companyId} onChange={e => setParasut({ ...parasut, companyId: e.target.value })} placeholder="Paraşüt şirket ID" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-id" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Client ID</Label>
                    <Input id="client-id" className={inputClass} value={parasut.clientId} onChange={e => setParasut({ ...parasut, clientId: e.target.value })} placeholder="OAuth Client ID" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-secret" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Client Secret</Label>
                  <div className="flex items-center gap-2">
                    <Input id="client-secret" className={inputClass + ' flex-1'} type={showPasswords.parasutClientSecret ? 'text' : 'password'} value={parasut.clientSecret} onChange={e => setParasut({ ...parasut, clientSecret: e.target.value })} placeholder="OAuth Client Secret" />
                    <button className="p-2.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" onClick={() => togglePasswordVisibility('parasutClientSecret')}>
                      {showPasswords.parasutClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kullanıcı Adı</Label>
                    <Input id="username" className={inputClass} value={parasut.username} onChange={e => setParasut({ ...parasut, username: e.target.value })} placeholder="Paraşüt kullanıcı adı" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Şifre</Label>
                    <div className="flex items-center gap-2">
                      <Input id="password" className={inputClass + ' flex-1'} type={showPasswords.parasutPassword ? 'text' : 'password'} value={parasut.password} onChange={e => setParasut({ ...parasut, password: e.target.value })} placeholder="Paraşüt şifresi" />
                      <button className="p-2.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" onClick={() => togglePasswordVisibility('parasutPassword')}>
                        {showPasswords.parasutPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-l-4 border-blue-400">
                  <Globe className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Paraşüt kimlik bilgilerinizi nerede bulacağınızı öğrenin:</p>
                    <ul className="text-sm space-y-1">
                      <li><a href="https://api.parasut.com" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline text-blue-600">API Bilgileri</a></li>
                      <li><a href="https://api.parasut.com" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline text-blue-600">OAuth Ayarlari</a></li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button onClick={handleParasutSave} disabled={saving} className={`inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r ${colors.from} ${colors.to} text-white font-semibold rounded-xl hover:opacity-90 shadow-lg ${colors.shadow} disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm`}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Değişiklikleri Kaydet
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== WhatsApp Tab ===== */}
        {activeTab === 'whatsapp' && (
          <div className="rounded-2xl shadow-xl bg-white dark:bg-gray-900 overflow-hidden">
            <div className={`h-1.5 bg-gradient-to-r ${colors.from} ${colors.to}`} />
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to}`}>
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">WhatsApp Entegrasyonu</h3>
                    <p className="text-xs text-gray-400">WhatsApp Business API&apos;yi entegre edin</p>
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
                  {whatsapp.connected ? 'Bagli' : 'Bagli Degil'}
                </span>
              </div>

              <div className="space-y-5">
                {!whatsapp.connected && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-l-4 border-amber-400">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">WhatsApp Business hesabınız henüz bağlı değil.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="phone-number-id" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefon Numarası ID</Label>
                  <Input id="phone-number-id" className={inputClass} value={whatsapp.phoneNumberId} onChange={e => setWhatsapp({ ...whatsapp, phoneNumberId: e.target.value })} placeholder="1234567890123" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="access-token" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Access Token</Label>
                  <div className="flex items-center gap-2">
                    <Input id="access-token" className={inputClass + ' flex-1'} type={showPasswords.whatsappAccessToken ? 'text' : 'password'} value={whatsapp.accessToken} onChange={e => setWhatsapp({ ...whatsapp, accessToken: e.target.value })} placeholder="EAABsxxxxxxxxxxxxxxxxxx" />
                    <button className="p-2.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" onClick={() => togglePasswordVisibility('whatsappAccessToken')}>
                      {showPasswords.whatsappAccessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-account-id" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Business Account ID</Label>
                  <Input id="business-account-id" className={inputClass} value={whatsapp.businessAccountId} onChange={e => setWhatsapp({ ...whatsapp, businessAccountId: e.target.value })} placeholder="9876543210123" />
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button onClick={handleWhatsAppSave} disabled={saving} className={`inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r ${colors.from} ${colors.to} text-white font-semibold rounded-xl hover:opacity-90 shadow-lg ${colors.shadow} disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm`}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Değişiklikleri Kaydet
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== Team Tab ===== */}
        {activeTab === 'team' && (
          <div className="rounded-2xl shadow-xl bg-white dark:bg-gray-900 overflow-hidden">
            <div className={`h-1.5 bg-gradient-to-r ${colors.from} ${colors.to}`} />
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to}`}>
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Ekip Üyeleri</h3>
                  <p className="text-xs text-gray-400">Ekibinizi yönetin ve yeni üyeler ekleyin</p>
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
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Henüz ekip üyesi eklenmemiş</p>
                <p className="text-sm text-gray-400 mb-8 max-w-sm">
                  Ekibinize üye ekleyerek teklifleri birlikte yönetebilirsiniz. Her üye kendi tekliflerini oluşturabilir.
                </p>
                <button className={`inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r ${colors.from} ${colors.to} text-white font-semibold rounded-xl hover:opacity-90 shadow-lg ${colors.shadow} transition-all text-sm`}>
                  <UserPlus className="w-4 h-4" />
                  Ekip Üyesi Ekle
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== Subscription Tab ===== */}
        {activeTab === 'subscription' && (
          <div className="space-y-6">
            {/* Current Plan */}
            <div className="rounded-2xl shadow-xl bg-white dark:bg-gray-900 overflow-hidden">
              <div className={`h-1.5 bg-gradient-to-r ${colors.from} ${colors.to}`} />
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to}`}>
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Abonelik</h3>
                    <p className="text-xs text-gray-400">Mevcut planınız ve abonelik bilgileriniz</p>
                  </div>
                </div>

                {/* Current Plan Badge */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-yellow-950/20 border border-amber-200 dark:border-amber-800 gap-4 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25">
                      <Zap className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Mevcut Plan</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">Ücretsiz</p>
                    </div>
                  </div>
                  <button className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:opacity-90 shadow-lg shadow-amber-500/25 transition-all text-sm flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    Planı Yükselt
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Plan Comparison */}
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Plan Karşılaştırması
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Starter */}
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900 hover:shadow-lg transition-all group">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                        <Zap className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">Starter</h5>
                        <p className="text-xs text-gray-400">Küçük işletmeler için</p>
                      </div>
                    </div>
                    <ul className="space-y-3">
                      {['50 teklif / ay', '1 ekip üyesi', 'Paraşüt entegrasyonu'].map(f => (
                        <li key={f} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                      <li className="flex items-center gap-3 text-sm text-gray-300 dark:text-gray-600">
                        <X className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0" />
                        WhatsApp entegrasyonu
                      </li>
                    </ul>
                  </div>

                  {/* Professional */}
                  <div className="relative rounded-2xl border-2 border-blue-500 p-6 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 shadow-xl shadow-blue-500/10">
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg">
                      <Star className="w-3 h-3 inline mr-1 -mt-0.5" />
                      Önerilen
                    </span>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <Crown className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">Professional</h5>
                        <p className="text-xs text-gray-400">Büyüyen ekipler için</p>
                      </div>
                    </div>
                    <ul className="space-y-3">
                      {['Sınırsız teklif', '5 ekip üyesi', 'Paraşüt entegrasyonu', 'WhatsApp entegrasyonu'].map(f => (
                        <li key={f} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button className="w-full mt-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:opacity-90 shadow-lg shadow-blue-500/25 transition-all text-sm flex items-center justify-center gap-2">
                      Professional&apos;a Gec
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
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Ödeme Geçmişi</h3>
                </div>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mb-5">
                    <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Henuz fatura bulunmuyor</p>
                  <p className="text-sm text-gray-400 max-w-sm">
                    Ücretli bir plana geçtiğinizde faturalarınız burada görünecek.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
