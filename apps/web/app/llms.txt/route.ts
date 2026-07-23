import { renderLlmsTxt } from '@/content/llms';
import { siteUrl } from '@/content/site';

export const dynamic = 'force-static';

export function GET(): Response {
  return new Response(renderLlmsTxt(siteUrl), {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}
