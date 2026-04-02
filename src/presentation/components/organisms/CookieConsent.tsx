'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

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

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

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

    // Trigger analytics and marketing scripts
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
    if (key === 'necessary') return; // Prevent toggling necessary cookies

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
                <h2 className="text-xl font-bold text-foreground">Çerezler ve Gizlilik</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Web sitesinin en iyi şekilde çalışabilmesi için gerekli çerezleri kullanıyoruz. 
                  Analitik ve pazarlama çerezlerine izin vererek, deneyiminizi iyileştirmemize yardımcı 
                  olabilirsiniz. Daha fazla bilgi için{' '}
                  <a
                    href="/kvkk"
                    className="text-blue-600 hover:text-blue-700 underline font-medium"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    KVKK Aydınlatma Metni
                  </a>
                  nizi inceleyebilirsiniz.
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
                    <p className="font-medium text-sm text-foreground">Zorunlu Çerezler</p>
                    <p className="text-xs text-muted-foreground">Sitemin işleyişi için gerekli</p>
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
                    <p className="font-medium text-sm text-foreground">Analitik Çerezler</p>
                    <p className="text-xs text-muted-foreground">İstatistik ve kullanım analizi için</p>
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
                    <p className="font-medium text-sm text-foreground">Pazarlama Çerezleri</p>
                    <p className="text-xs text-muted-foreground">Kişiselleştirilmiş reklam ve içerik için</p>
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
                  Tercihlerimi Ayarla
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={handleAcceptNecessary}
                  className="bg-white hover:bg-gray-50"
                >
                  Sadece Zorunlu
                </Button>
                <Button
                  onClick={handleAcceptAll}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Tümünü Kabul Et
                </Button>
              </div>
            </div>
          ) : (
            // Detailed Preferences
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Çerez Tercihleri</h3>
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
                      <h4 className="font-semibold text-foreground">Zorunlu Çerezler</h4>
                      <p className="text-sm text-muted-foreground">
                        Web sitesinin temel işlevselliği için gerekli olan çerezler. Bunlar kapatılamaz 
                        ancak tercih edilebilir.
                      </p>
                    </div>
                  </div>
                  <div className="ml-7 space-y-1 text-xs text-muted-foreground">
                    <p>- Oturum yönetimi</p>
                    <p>- Güvenlik ve doğrulama</p>
                    <p>- Kullanıcı tercih saklama</p>
                    <p>- CSRF koruması</p>
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
                      <h4 className="font-semibold text-foreground">Analitik Çerezler</h4>
                      <p className="text-sm text-muted-foreground">
                        Web sitesi ziyaretçi davranışını anlamak ve hizmetimizi iyileştirmek için 
                        istatistiksel veriler toplarız.
                      </p>
                    </div>
                  </div>
                  <div className="ml-7 space-y-1 text-xs text-muted-foreground">
                    <p>- Sayfa görüntülemeleri</p>
                    <p>- Ziyaretçi coğrafyası</p>
                    <p>- İşletim sistemi ve tarayıcı bilgisi</p>
                    <p>- Hata raporlaması</p>
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
                      <h4 className="font-semibold text-foreground">Pazarlama Çerezleri</h4>
                      <p className="text-sm text-muted-foreground">
                        İlgi alanlarınıza göre kişiselleştirilmiş içerik ve reklamlar sunmak için 
                        kullanıcı davranışını takip ederiz.
                      </p>
                    </div>
                  </div>
                  <div className="ml-7 space-y-1 text-xs text-muted-foreground">
                    <p>- İlgi alanı analizi</p>
                    <p>- Hedefli reklam gösterimi</p>
                    <p>- Sosyal ağ entegrasyonu</p>
                    <p>- Ziyaretçi tanımlama</p>
                  </div>
                </div>
              </div>

              {/* Legal Info */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-xs text-muted-foreground space-y-2">
                <p>
                  Detaylı bilgi için{' '}
                  <a
                    href="/kvkk"
                    className="text-blue-600 hover:text-blue-700 underline font-medium"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    KVKK Aydınlatma Metni
                  </a>
                  nizi inceleyebilirsiniz.
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
                  Geri Dön
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleAcceptNecessary}
                    className="bg-white hover:bg-gray-50"
                  >
                    Sadece Zorunlu
                  </Button>
                  <Button
                    onClick={handleSavePreferences}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Tercihlerimi Kaydet
                  </Button>
                  <Button
                    onClick={handleAcceptAll}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Tümünü Kabul Et
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
