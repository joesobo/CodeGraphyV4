export const siteName = 'CodeGraphy';
const defaultSiteOrigin = 'https://codegraphy.dev';

export const siteOrigin = resolvePublicOrigin(process.env.NEXT_PUBLIC_SITE_URL);
export const siteUrl = new URL(siteOrigin);
export const siteDescription =
  'A local Relationship Graph for exploring files, symbols, packages, and their connections in VS Code or from the command line.';

function resolvePublicOrigin(configuredOrigin: string | undefined): string {
  const candidate = configuredOrigin ?? defaultSiteOrigin;
  if (!URL.canParse(candidate)) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be an absolute HTTP or HTTPS URL.');
  }

  const url = new URL(candidate);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_SITE_URL must use the HTTP or HTTPS protocol.');
  }

  return url.origin;
}
