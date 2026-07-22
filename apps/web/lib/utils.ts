import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function isRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Latest published version behind the given registry URL, or null when the
 * lookup fails — version badges are decoration, so a registry outage must
 * never break a page render.
 */
export async function getPackageVersion(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { next: { revalidate: 60 * 60 } });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { version?: string };
    return data.version || null;
  } catch {
    return null;
  }
}
