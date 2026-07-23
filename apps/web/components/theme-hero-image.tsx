import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

interface ThemeHeroImageProps {
  alt: string;
  darkSrc: string;
  lightSrc: string;
  objectPosition?: string;
}

export function ThemeHeroImage({
  alt,
  darkSrc,
  lightSrc,
  objectPosition = 'center',
}: ThemeHeroImageProps): React.ReactElement {
  const style = {
    '--theme-image-dark': `url("${darkSrc}")`,
    '--theme-image-light': `url("${lightSrc}")`,
    backgroundPosition: objectPosition,
  } as CSSProperties;

  return (
    <div
      aria-hidden={alt ? undefined : 'true'}
      aria-label={alt || undefined}
      className={cn('hero-image theme-hero-image absolute inset-0')}
      role={alt ? 'img' : undefined}
      style={style}
    />
  );
}
