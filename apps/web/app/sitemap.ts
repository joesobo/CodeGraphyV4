import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/content/site';

const routes = [
  { path: '', priority: 1 },
  { path: '/docs', priority: 0.9 },
  { path: '/plugins', priority: 0.8 },
  { path: '/examples', priority: 0.8 },
] satisfies readonly { path: string; priority: number }[];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map(({ path, priority }) => ({
    changeFrequency: 'monthly',
    priority,
    url: `${siteOrigin}${path}`,
  }));
}
