import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/tr/dashboard/',
          '/en/dashboard/',
          '/proposal/',
          '/*.json$',
          '/*.xml$',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: '/',
      },
    ],
    sitemap: 'https://teklifpro.com/sitemap.xml',
    crawlDelay: 1,
    host: 'https://teklifpro.com',
  };
}
