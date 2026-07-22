import { renderLlmsTxt } from '@/content/llms';

export const dynamic = 'force-static';

export function GET(): Response {
  const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://codegraphy.dev');

  return new Response(renderLlmsTxt(siteUrl), {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}
