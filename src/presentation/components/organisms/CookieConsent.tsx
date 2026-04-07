'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/shared/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

const COOKIE_NAME = 'teklifpro_cookie_consent';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

// Inline translations — this component renders in root layout (outside i18n provider)
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: 'Çerezler ve Gizlilik',
    description: 'Web sitesinin en iyi şekilde çalışabilmesi için gerekli çerezleri kullanıyoruz. Analitik ve pazarlama çerezlerine izin vererek, deneyiminizi iyileştirmemize yardımcı olabilirsiniz. Daha fazla bilgi için',
    kvkkLink: 'KVKK Aydınlatma Metni',
    kvkkSuffix: 'nizi inceleyebilirsiniz.',
    detailedInfo: 'Detaylı bilgi için',
    preferencesTitle: 'Çerez Tercihleri',
    necessaryCookies: 'Zorunlu Çerezler',
    necessaryDesc: 'Sitemin işleyişi için gerekli',
    necessaryDetailDesc: 'Web sitesinin temel işlevselliği için gerekli olan çerezler. Bunlar kapatılamaz ancak tercih edilebilir.',
    necessarySession: 'Oturum yönetimi',
    necessarySecurity: 'Güvenlik ve doğrulama',
    necessaryPreferences: 'Kullanıcı tercih saklama',
    necessaryCsrf: 'CSRF koruması',
    analyticsCookies: 'Analitik Çerezler',
    analyticsDesc: 'İstatistik ve kullanım analizi için',
    analyticsDetailDesc: 'Web sitesi ziyaretçi davranışını anlamak ve hizmetimizi iyileştirmek için istatistiksel veriler toplarız.',
    analyticsPageViews: 'Sayfa görüntülemeleri',
    analyticsGeography: 'Ziyaretçi coğrafyası',
    analyticsBrowser: 'İşletim sistemi ve tarayıcı bilgisi',
    analyticsErrors: 'Hata raporlaması',
    marketingCookies: 'Pazarlama Çerezleri',
    marketingDesc: 'Kişiselleştirilmiş reklam ve içerik için',
    marketingDetailDesc: 'İlgi alanlarınıza göre kişiselleştirilmiş içerik ve reklamlar sunmak için kullanıcı davranışını takip ederiz.',
    marketingInterests: 'İlgi alanı analizi',
    marketingAds: 'Hedefli reklam gösterimi',
    marketingSocial: 'Sosyal ağ entegrasyonu',
    marketingVisitor: 'Ziyaretçi tanımlama',
    customizePreferences: 'Tercihlerimi Ayarla',
    necessaryOnly: 'Sadece Zorunlu',
    acceptAll: 'Tümünü Kabul Et',
    savePreferences: 'Tercihlerimi Kaydet',
    goBack: 'Geri Dön',
  },
  en: {
    title: 'Cookies and Privacy',
    description: 'We use necessary cookies to ensure the website functions properly. By allowing analytics and marketing cookies, you can help us improve your experience. For more information, please review our',
    kvkkLink: 'Data Protection Notice',
    kvkkSuffix: '.',
    detailedInfo: 'For detailed information, please review our',
    preferencesTitle: 'Cookie Preferences',
    necessaryCookies: 'Necessary Cookies',
    necessaryDesc: 'Required for site functionality',
    necessaryDetailDesc: 'Cookies required for the basic functionality of the website. These cannot be turned off but can be configured.',
    necessarySession: 'Session management',
    necessarySecurity: 'Security and authentication',
    necessaryPreferences: 'User preference storage',
    necessaryCsrf: 'CSRF protection',
    analyticsCookies: 'Analytics Cookies',
    analyticsDesc: 'For statistics and usage analysis',
    analyticsDetailDesc: 'We collect statistical data to understand website visitor behavior and improve our service.',
    analyticsPageViews: 'Page views',
    analyticsGeography: 'Visitor geography',
    analyticsBrowser: 'Operating system and browser info',
    analyticsErrors: 'Error reporting',
    marketingCookies: 'Marketing Cookies',
    marketingDesc: 'For personalized ads and content',
    marketingDetailDesc: 'We track user behavior to deliver personalized content and advertisements based on your interests.',
    marketingInterests: 'Interest analysis',
    marketingAds: 'Targeted advertising',
    marketingSocial: 'Social network integration',
    marketingVisitor: 'Visitor identification',
    customizePreferences: 'Customize Preferences',
    necessaryOnly: 'Necessary Only',
    acceptAll: 'Accept All',
    savePreferences: 'Save Preferences',
    goBack: 'Go Back',
  },
};

function detectLocale(): string {
  if (typeof window === 'undefined') return 'tr';
  const path = window.location.pathname;
  if (path.startsWith('/en')) return 'en';
  return 'tr';
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  const locale = useMemo(detectLocale, []);
  const t = (key: string) => translations[locale]?.[key] ?? translations.tr[key] ?? key;

  // Load preferences from cookie on mount
  useEffect(() => {
    const checkCookieConsent = () => {
      const cookie = getCookie(COOKIE_NAME);
      if (!cookie) {
        setShowBanner(true);
      }
      setIsLoaded(true);
    };

    // Small delay to ensure hydration
    const timer = setTimeout(checkCookieConsent, 100);
    return () => clearTimeout(timer);
  }, []);

  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const nameEQ = name + '=';
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      if (cookie.indexOf(nameEQ) === 0) {
        return decodeURIComponent(cookie.substring(nameEQ.length));
      }
    }
    return null;
  };

  const setCookie = (name: string, value: string, maxAge: number) => {
    if (typeof document === 'undefined') return;
    const date = new Date();
    date.setTime(date.getTime() + maxAge * 1000);
    const expires = 'expires=' + date.toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)};${expires};path=/;SameSite=Strict`;
  };

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(allAccepted);
    setCookie(COOKIE_NAME, JSON.stringify(allAccepted), COOKIE_MAX_AGE);
    setShowBanner(false);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookie-consent-accepted', { detail: allAccepted }));
    }
  };

  const handleAcceptNecessary = () => {
    setCookie(COOKIE_NAME, JSON.stringify(DEFAULT_PREFERENCES), COOKIE_MAX_AGE);
    setShowBanner(false);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookie-consent-accepted', { detail: DEFAULT_PREFERENCES }));
    }
  };

  const handleSavePreferences = () => {
    setCookie(COOKIE_NAME, JSON.stringify(preferences), COOKIE_MAX_AGE);
    setShowBanner(false);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookie-consent-accepted', { detail: preferences }));
    }
  };

  const togglePreference = (key: keyof CookiePreferences) => {
    if (key === 'necessary') return;

    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!isLoaded || !showBanner) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-300"
        onClick={handleAcceptNecessary}
      />

      {/* Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
        <div className="max-w-4xl mx-auto p-6 md:p-8">
          {!showDetails ? (
            // Main Banner
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-foreground">{t('title')}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('description')}{' '}
                  <a
                    href="/kvkk"
                    className="text-blue-600 hover:text-blue-700 underline font-medium"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('kvkkLink')}
                  </a>
                  {t('kvkkSuffix')}
                </p>
              </div>

              {/* Cookie Categories Summary */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="w-4 h-4 cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-foreground">{t('necessaryCookies')}</p>
                    <p className="text-xs text-muted-foreground">{t('necessaryDesc')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={() => togglePreference('analytics')}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-foreground">{t('analyticsCookies')}</p>
                    <p className="text-xs text-muted-foreground">{t('analyticsDesc')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={() => togglePreference('marketing')}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-foreground">{t('marketingCookies')}</p>
                    <p className="text-xs text-muted-foreground">{t('marketingDesc')}</p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDetails(true)}
                  className="flex items-center gap-2"
                >
                  {t('customizePreferences')}
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={handleAcceptNecessary}
                  className="bg-white hover:bg-gray-50"
                >
                  {t('necessaryOnly')}
                </Button>
                <Button
                  onClick={handleAcceptAll}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {t('acceptAll')}
                </Button>
              </div>
            </div>
          ) : (
            // Detailed Preferences
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">{t('preferencesTitle')}</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Necessary Cookies */}
                <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="w-4 h-4 cursor-not-allowed"
                    />
                    <div>
                      <h4 className="font-semibold text-foreground">{t('necessaryCookies')}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t('necessaryDetailDesc')}
                      </p>
                    </div>
                  </div>
                  <div className="ml-7 space-y-1 text-xs text-muted-foreground">
                    <p>- {t('necessarySession')}</p>
                    <p>- {t('necessarySecurity')}</p>
                    <p>- {t('necessaryPreferences')}</p>
                    <p>- {t('necessaryCsrf')}</p>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={() => togglePreference('analytics')}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <h4 className="font-semibold text-foreground">{t('analyticsCookies')}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t('analyticsDetailDesc')}
                      </p>
                    </div>
                  </div>
                  <div className="ml-7 space-y-1 text-xs text-muted-foreground">
                    <p>- {t('analyticsPageViews')}</p>
                    <p>- {t('analyticsGeography')}</p>
                    <p>- {t('analyticsBrowser')}</p>
                    <p>- {t('analyticsErrors')}</p>
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={() => togglePreference('marketing')}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <h4 className="font-semibold text-foreground">{t('marketingCookies')}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t('marketingDetailDesc')}
                      </p>
                    </div>
                  </div>
                  <div className="ml-7 space-y-1 text-xs text-muted-foreground">
                    <p>- {t('marketingInterests')}</p>
                    <p>- {t('marketingAds')}</p>
                    <p>- {t('marketingSocial')}</p>
                    <p>- {t('marketingVisitor')}</p>
                  </div>
                </div>
              </div>

              {/* Legal Info */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-xs text-muted-foreground space-y-2">
                <p>
                  {t('detailedInfo')}{' '}
                  <a
                    href="/kvkk"
                    className="text-blue-600 hover:text-blue-700 underline font-medium"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('kvkkLink')}
                  </a>
                  {t('kvkkSuffix')}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <Button
                  variant="outline"
                  onClick={() => setShowDetails(false)}
                  className="flex items-center gap-2"
                >
                  <ChevronUp className="w-4 h-4" />
                  {t('goBack')}
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleAcceptNecessary}
                    className="bg-white hover:bg-gray-50"
                  >
                    {t('necessaryOnly')}
                  </Button>
                  <Button
                    onClick={handleSavePreferences}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {t('savePreferences')}
                  </Button>
                  <Button
                    onClick={handleAcceptAll}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {t('acceptAll')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default CookieConsent;
