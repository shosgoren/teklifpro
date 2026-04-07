import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { getLocale } from 'next-intl/server';
import './globals.css';
import { Toaster } from 'sonner';
import CookieConsent from '@/presentation/components/CookieConsent';
import ThemeProvider from '@/shared/providers/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teklifpro.com';
const siteTitle = 'TeklifPro';
const siteDescription =
  'TeklifPro - Profesyonel İş Teklifleri Yönetim Sistemi. Hızlı, güvenli ve kolay kullanımlı teklif oluşturma ve yönetim platformu.';
const keywords = [
  'teklif sistemi',
  'iş teklifleri',
  'teklif yönetimi',
  'profesyonel teklif',
  'SaaS',
  'işletme yönetimi',
  'müşteri yönetimi',
  'teklif oluşturma',
  'dijital teklif',
  'teklif yazılımı',
  'Parasut entegrasyonu',
];

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 5.0,
  userScalable: true,
  themeColor: '#0f172a',
  colorScheme: 'light dark',
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    template: `TeklifPro | %s`,
    default: 'TeklifPro - Profesyonel İş Teklifleri Yönetim Sistemi',
  },
  description: siteDescription,
  keywords: keywords,
  authors: [
    {
      name: 'TeklifPro Team',
      url: baseUrl,
    },
  ],
  creator: 'TeklifPro',
  publisher: 'TeklifPro',
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    alternateLocale: ['en_US'],
    url: baseUrl,
    siteName: siteTitle,
    title: 'TeklifPro - Profesyonel İş Teklifleri Yönetim Sistemi',
    description: siteDescription,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TeklifPro - Professional Quote Management System',
        type: 'image/png',
      },
      {
        url: '/og-image-square.png',
        width: 800,
        height: 800,
        alt: 'TeklifPro Logo',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@teklifpro',
    creator: '@teklifpro',
    title: 'TeklifPro - Profesyonel İş Teklifleri Yönetim Sistemi',
    description: siteDescription,
    images: ['/twitter-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
      { url: '/apple-touch-icon-152x152.png', sizes: '152x152' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
        color: '#0f172a',
      },
    ],
  },
  manifest: '/manifest.json',
  verification: {
    google: 'google-site-verification-code',
    yandex: 'yandex-verification-code',
  },
  alternates: {
    canonical: baseUrl,
    languages: {
      'tr-TR': `${baseUrl}/tr`,
      'en-US': `${baseUrl}/en`,
    },
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'Business',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: siteTitle,
        url: baseUrl,
        logo: {
          '@type': 'ImageObject',
          '@id': `${baseUrl}/#logo`,
          url: `${baseUrl}/logo.png`,
          width: 512,
          height: 512,
        },
        sameAs: [
          'https://www.facebook.com/teklifpro',
          'https://twitter.com/teklifpro',
          'https://www.linkedin.com/company/teklifpro',
          'https://www.instagram.com/teklifpro',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'Customer Service',
          email: 'support@teklifpro.com',
          telephone: '+90-xxx-xxx-xxxx',
        },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${baseUrl}/#software`,
        name: siteTitle,
        description: siteDescription,
        url: baseUrl,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'TRY',
          availability: 'https://schema.org/InStock',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '152',
          reviewCount: '152',
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: siteTitle,
        description: siteDescription,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${baseUrl}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <meta name="msapplication-TileColor" content="#0f172a" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="application-name" content={siteTitle} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={siteTitle} />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          <Toaster position="top-right" richColors />
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
}
