import Image from 'next/image';
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
  const imageClassName = cn(
    'object-cover transition-opacity duration-300 ease-out motion-reduce:transition-none',
  );

  return (
    <div className="hero-image absolute inset-0">
      <Image
        alt={alt}
        className={cn(imageClassName, 'opacity-100 dark:opacity-0')}
        fill
        priority
        sizes="100vw"
        src={lightSrc}
        style={{ objectPosition }}
      />
      <Image
        alt=""
        aria-hidden="true"
        className={cn(imageClassName, 'opacity-0 dark:opacity-100')}
        fill
        priority
        sizes="100vw"
        src={darkSrc}
        style={{ objectPosition }}
      />
    </div>
  );
}
