import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/content/site';

export default function robots(): MetadataRoute.Robots {
  return {
    host: siteOrigin,
    rules: {
      allow: '/',
      userAgent: '*',
    },
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}
