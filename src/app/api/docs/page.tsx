'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('ApiDocsPage');

const i18n = {
  tr: {
    pageTitle: 'TeklifPro API Dokümantasyonu',
    metaDescription: 'TeklifPro RESTful API Dokümantasyonu v1.0',
    docVersion: 'Dokümantasyon v1.0',
    loading: 'API Dokümantasyonu Yükleniyor...',
    loadFailed: 'API Dokümantasyonu Yüklenemedi',
    tryAgainLater: 'Lütfen daha sonra tekrar deneyiniz.',
    privacyPolicy: 'Gizlilik Politikası',
    support: 'Destek',
  },
  en: {
    pageTitle: 'TeklifPro API Documentation',
    metaDescription: 'TeklifPro RESTful API Documentation v1.0',
    docVersion: 'Documentation v1.0',
    loading: 'Loading API Documentation...',
    loadFailed: 'Failed to Load API Documentation',
    tryAgainLater: 'Please try again later.',
    privacyPolicy: 'Privacy Policy',
    support: 'Support',
  },
} as const;

function detectLocale(): 'tr' | 'en' {
  if (typeof window === 'undefined') return 'tr';
  const path = window.location.pathname;
  if (path.startsWith('/en')) return 'en';
  const lang = navigator.language?.toLowerCase() ?? '';
  if (lang.startsWith('en')) return 'en';
  return 'tr';
}

export default function ApiDocsPage() {
  const [isDark, setIsDark] = useState(false);
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState<'tr' | 'en'>('tr');

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
    setLocale(detectLocale());
  }, []);

  const t = i18n[locale];

  useEffect(() => {
    const loadSpec = async () => {
      try {
        const response = await fetch('/api/docs/openapi.json');
        const data = await response.json();
        setSpec(data);
      } catch (error) {
        logger.error('Failed to load OpenAPI spec', error);
      } finally {
        setLoading(false);
      }
    };

    loadSpec();
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <html lang={locale} className={isDark ? 'dark' : ''}>
      <head>
        <title>{t.pageTitle}</title>
        <meta name="description" content={t.metaDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui-bundle.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui-standalone-preset.js"></script>
        <link
          rel="stylesheet"
          type="text/css"
          href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@4/swagger-ui.css"
        />
      </head>
      <body className={isDark ? 'dark bg-slate-950 text-white' : 'bg-white text-slate-900'}>
        <div className="flex flex-col h-screen">
          <header className={`border-b ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'} sticky top-0 z-50`}>
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">TP</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">TeklifPro API</h1>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t.docVersion}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                    {t.loading}
                  </p>
                </div>
              </div>
            ) : spec ? (
              <div
                id="swagger-ui"
                className={`swagger-ui-wrapper ${isDark ? 'dark-theme' : ''}`}
                dangerouslySetInnerHTML={{
                  __html: `
                    <script>
                      window.onload = function() {
                        const ui = SwaggerUIBundle({
                          url: '/api/docs/openapi.json',
                          dom_id: '#swagger-ui',
                          presets: [
                            SwaggerUIBundle.presets.apis,
                            SwaggerUIStandalonePreset
                          ],
                          layout: 'StandaloneLayout',
                          deepLinking: true,
                          tryItOutEnabled: true,
                          persistAuthorization: true,
                          filter: true,
                          showOperationFilterTag: true,
                          docExpansion: 'list',
                          defaultModelsExpandDepth: 1,
                          defaultModelExpandDepth: 1,
                        });
                        window.ui = ui;
                      }
                    </script>
                  `,
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className={`mb-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                    {t.loadFailed}
                  </p>
                  <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                    {t.tryAgainLater}
                  </p>
                </div>
              </div>
            )}
          </main>

          <footer className={`border-t ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'} px-4 py-4`}>
            <div className="max-w-7xl mx-auto text-center">
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                TeklifPro API v1.0 |
                <a href={`/${locale}/kvkk`} className="ml-1 text-blue-500 hover:underline">
                  {t.privacyPolicy}
                </a>
                {' '}|
                <a href="https://support.teklifpro.com" className="ml-1 text-blue-500 hover:underline">
                  {t.support}
                </a>
              </p>
            </div>
          </footer>
        </div>

        <style jsx>{`
          :global(.swagger-ui-wrapper .swagger-ui) {
            padding: 0;
          }

          :global(.dark-theme .swagger-ui) {
            background-color: rgb(15, 23, 42);
            color: white;
          }

          :global(.dark-theme .swagger-ui .topbar) {
            background-color: rgb(30, 41, 59);
          }

          :global(.dark-theme .swagger-ui .scheme-container) {
            background-color: rgb(30, 41, 59);
          }

          :global(.dark-theme .swagger-ui textarea) {
            background-color: rgb(51, 65, 85);
            color: white;
            border-color: rgb(71, 85, 105);
          }

          :global(.dark-theme .swagger-ui input[type='text'],
          .dark-theme .swagger-ui input[type='password']) {
            background-color: rgb(51, 65, 85);
            color: white;
            border-color: rgb(71, 85, 105);
          }

          :global(.dark-theme .swagger-ui .parameter__name) {
            color: rgb(226, 232, 240);
          }

          :global(.dark-theme .swagger-ui .model-box) {
            background-color: rgb(30, 41, 59);
            border-color: rgb(71, 85, 105);
          }

          :global(.swagger-ui .btn) {
            border-radius: 0.5rem;
          }

          :global(.swagger-ui .btn-primary) {
            background-color: rgb(59, 130, 246);
          }

          :global(.swagger-ui .btn-primary:focus,
          .swagger-ui .btn-primary:hover) {
            background-color: rgb(37, 99, 235);
          }
        `}</style>
      </body>
    </html>
  );
}
