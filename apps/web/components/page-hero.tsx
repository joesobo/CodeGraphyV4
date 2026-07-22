import Image from 'next/image';
import { cn } from '@/lib/utils';

interface PageHeroProps {
  description: string;
  eyebrow: string;
  imageAlt: string;
  imagePosition?: string;
  imageSrc: string;
  title: string;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  size?: 'compact' | 'default' | 'tall';
  tone?: 'default' | 'minimal';
}

const heroSizeClassName: Record<NonNullable<PageHeroProps['size']>, string> = {
  compact: 'min-h-[52svh] py-24 sm:min-h-[56svh] sm:py-28',
  default: 'min-h-[66svh] py-28 sm:min-h-[72svh] sm:py-32',
  tall: 'min-h-svh py-28 sm:py-32',
};

export function PageHero({
  actions,
  aside,
  description,
  eyebrow,
  imageAlt,
  imagePosition = 'center',
  imageSrc,
  size = 'default',
  title,
  tone = 'default',
}: PageHeroProps): React.ReactElement {
  return (
    <header
      className={cn(
        'page-hero relative isolate flex overflow-hidden bg-[#061722] px-5 text-white sm:px-8 lg:px-12',
        heroSizeClassName[size],
      )}
    >
      <Image
        alt={imageAlt}
        aria-hidden={imageAlt ? undefined : 'true'}
        className="hero-image object-cover"
        fill
        priority
        sizes="100vw"
        src={imageSrc}
        style={{ objectPosition: imagePosition }}
      />
      <div className={cn('absolute inset-0', tone === 'minimal' ? 'page-hero-grade-minimal' : 'page-hero-grade')} />
      <div aria-hidden="true" className="ocean-current absolute inset-0 opacity-70"><span /><span /></div>
      <div className="relative mx-auto grid w-full max-w-[90rem] gap-12 self-end lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.34fr)] lg:items-end lg:gap-24">
        <div className="hero-copy">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#61d8ca]">{eyebrow}</p>
          <h1 className="mt-5 max-w-5xl text-balance text-[clamp(4rem,8vw,8rem)] font-medium leading-[0.84] tracking-[-0.055em]">{title}</h1>
          <p className="mt-6 max-w-[43rem] text-pretty text-base leading-7 text-white/72 sm:text-lg">{description}</p>
          {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
        </div>
        {aside ? (
          <div className="hero-aside rounded-2xl border border-white/14 bg-black/15 p-5 text-sm leading-6 text-white/68 shadow-2xl backdrop-blur-md sm:p-6">
            {aside}
          </div>
        ) : null}
      </div>
    </header>
  );
}
