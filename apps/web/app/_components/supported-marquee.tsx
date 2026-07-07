'use client';

import { Icon } from '@/components/icon';
import { Link } from '@/components/link';
import { SectionHeader } from '@/components/section-header';
import { exampleContent } from '@/content/examples';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

interface SupportedMarqueeItem {
  href: string;
  iconUrl: string;
  label: string;
}

const edgeFadeClassName =
  'pointer-events-none absolute inset-y-0 z-10 w-12 from-background to-transparent sm:w-20';

const supportedItems = exampleContent.map((example) => ({
  href: example.href,
  iconUrl: example.iconUrl,
  label: example.name,
})) satisfies readonly SupportedMarqueeItem[];

export function SupportedMarquee(): React.ReactElement {
  return (
    <section className="grid gap-6">
      <SectionHeader title="Supported" />
      <SupportedMarqueeTrack items={supportedItems} />
    </section>
  );
}

function SupportedMarqueeTrack({
  items,
}: {
  items: readonly SupportedMarqueeItem[];
}): React.ReactElement {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className="relative overflow-hidden py-6">
      <div className={cn(edgeFadeClassName, 'left-0 bg-linear-to-r')} />
      <div className={cn(edgeFadeClassName, 'right-0 bg-linear-to-l')} />

      <div
        className={cn(
          'flex items-center',
          reduceMotion
            ? 'w-full justify-center'
            : 'w-max animate-[supported-marquee-scroll_48s_linear_infinite] hover:[animation-play-state:paused]',
        )}
      >
        <SupportedMarqueeSequence
          items={items}
          className={reduceMotion ? 'flex-wrap justify-center gap-y-6 pr-0' : undefined}
        />
        {reduceMotion ? null : <SupportedMarqueeSequence items={items} isHidden />}
      </div>
    </div>
  );
}

function SupportedMarqueeSequence({
  items,
  className,
  isHidden = false,
}: {
  items: readonly SupportedMarqueeItem[];
  className?: string;
  isHidden?: boolean;
}): React.ReactElement {
  return (
    <ul
      aria-hidden={isHidden || undefined}
      aria-label={isHidden ? undefined : 'Supported languages and project types'}
      className={cn('flex items-center gap-12 pr-12', className)}
    >
      {items.map((item) => (
        <li className="shrink-0" key={item.label}>
          <Link
            aria-label={`Open ${item.label} example`}
            className="flex items-center gap-3 text-foreground transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={item.href}
            tabIndex={isHidden ? -1 : undefined}
          >
            <Icon className="size-8 text-current sm:size-9" src={item.iconUrl} variant="mono" />
            <span className="text-xl font-semibold leading-none sm:text-2xl">
              {item.label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
