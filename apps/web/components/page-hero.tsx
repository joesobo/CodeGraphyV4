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
  compact: 'min-h-[34rem] py-24 sm:min-h-[38rem] sm:py-28',
  default: 'min-h-[40rem] py-24 sm:min-h-[44rem] sm:py-28',
  tall: 'min-h-[44rem] py-24 sm:min-h-[48rem] sm:py-28',
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
      <div className="relative mx-auto grid w-full max-w-[90rem] gap-10 self-end lg:grid-cols-[minmax(0,1fr)_minmax(19rem,.38fr)] lg:items-end lg:gap-20">
        <div className="hero-copy">
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#bad2ff]">{eyebrow}</p>
          <h1 className="mt-4 max-w-5xl text-balance text-[clamp(3.5rem,7.2vw,7.2rem)] font-medium leading-[0.91] tracking-[-0.045em]">{title}</h1>
          <p className="mt-5 max-w-[43rem] text-pretty text-base leading-7 text-white/94 sm:text-lg">{description}</p>
          {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
        </div>
        {aside ? (
          <div className="hero-aside border-t border-white/30 pt-5 text-sm leading-6 text-white/92 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
            {aside}
          </div>
        ) : null}
      </div>
    </header>
  );
}
