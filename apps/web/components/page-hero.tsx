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
}

const heroSizeClassName: Record<NonNullable<PageHeroProps['size']>, string> = {
  compact: 'min-h-[27rem] py-16 sm:min-h-[30rem] sm:py-20',
  default: 'min-h-[31rem] py-20 sm:min-h-[35rem] sm:py-24',
  tall: 'min-h-[calc(100svh-4.05rem)] py-20 sm:py-24',
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
}: PageHeroProps): React.ReactElement {
  return (
    <header
      className={cn(
        'relative isolate flex overflow-hidden bg-[#061722] px-5 text-white sm:px-8 lg:px-12',
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
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,15,25,.98)_0%,rgba(3,15,25,.9)_38%,rgba(3,15,25,.45)_68%,rgba(3,15,25,.18)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(3,15,25,.92)_0%,transparent_44%,rgba(3,15,25,.12)_100%)]" />
      <div aria-hidden="true" className="ocean-grid absolute inset-0 opacity-20" />
      <div className="relative mx-auto grid w-full max-w-[90rem] gap-10 self-end lg:grid-cols-[minmax(0,1fr)_minmax(17rem,.34fr)] lg:items-end lg:gap-20">
        <div className="hero-copy">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#61d8ca]">{eyebrow}</p>
          <h1 className="mt-5 max-w-5xl text-balance text-[clamp(4rem,8vw,7.5rem)] font-medium leading-[0.86] tracking-[-0.05em]">{title}</h1>
          <p className="mt-6 max-w-[43rem] text-pretty text-base leading-7 text-white/72 sm:text-lg">{description}</p>
          {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
        </div>
        {aside ? (
          <div className="hero-aside border-l border-[#61d8ca]/50 py-1 pl-5 text-sm leading-6 text-white/62 sm:pl-6">
            {aside}
          </div>
        ) : null}
      </div>
    </header>
  );
}
