import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig = {
  // Performans optimizasyonları
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Görsel optimizasyonu
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
    minimumCacheTTL: 60 * 60 * 24, // 24 saat
  },

  // Header konfigürasyonu
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },

  // Webpack bundle optimizasyonu
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        path: false,
      };
    }
    return config;
  },

  // Deneysel optimizasyonlar
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'date-fns',
      '@radix-ui/react-dialog',
      '@radix-ui/react-form',
    ],
    // React 19 özellikleri
    reactCompiler: true,
  },

  // Redirectler ve rewrites
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/dashboard/overview',
        permanent: false,
      },
    ];
  },

  // Rewrite kuralları
  async rewrites() {
    return {
      beforeFiles: [
        // API proxy yapılandırması gerekirse
      ],
    };
  },

  // Environment değişkenleri
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  // Swcminify ayarı
  swcMinify: true,
};

// Sentry konfigürasyonu (sadece production)
const sentryConfig = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
};

export default withSentryConfig(withNextIntl(nextConfig), sentryConfig);
