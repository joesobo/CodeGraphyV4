'use client';

import { Icon } from '@/components/icon';
import { Link } from '@/components/link';
import { SectionHeader } from '@/components/section-header';
import { exampleContent, type ExampleContent } from '@/content/examples';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

export function SupportedLanguages(): React.ReactElement {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <section className="grid min-w-0 w-full gap-8" id="language-coverage">
      <div className="mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <p className="section-kicker mb-4 text-primary">Language coverage</p>
        <SectionHeader
          title="A wide surface area, one consistent graph."
          description="Core ships broad baseline language coverage. Plugins add deeper, ecosystem-specific meaning where syntax alone is not enough."
        />
      </div>

      <div className="language-marquee w-full min-w-0 overflow-hidden py-2 sm:py-3">
        <div
          className={cn(
            'flex items-center',
            reduceMotion
              ? 'mx-auto w-full max-w-[90rem] justify-center px-5 sm:px-8 lg:px-12'
              : 'language-marquee-track w-max',
          )}
        >
          <LanguageSequence items={exampleContent} reduceMotion={reduceMotion} />
          {reduceMotion ? null : <LanguageSequence items={exampleContent} isHidden />}
        </div>
      </div>
    </section>
  );
}

function LanguageSequence({
  items,
  isHidden = false,
  reduceMotion = false,
}: {
  items: readonly ExampleContent[];
  isHidden?: boolean;
  reduceMotion?: boolean;
}): React.ReactElement {
  return (
    <ul
      aria-hidden={isHidden || undefined}
      aria-label={isHidden ? undefined : 'Supported languages and project types'}
      className={cn(
        'flex items-center gap-10 pr-10 sm:gap-14 sm:pr-14',
        reduceMotion && 'flex-wrap justify-center gap-y-6 pr-0 sm:pr-0',
      )}
    >
      {items.map((item) => (
        <li className="shrink-0" key={item.id}>
          <Link
            aria-label={`Open ${item.name} example`}
            className="language-marquee-item flex min-h-14 items-center gap-3 text-foreground focus-visible:relative focus-visible:z-10"
            href={item.href}
            tabIndex={isHidden ? -1 : undefined}
          >
            <Icon className="size-7 shrink-0 text-primary sm:size-9" src={item.iconUrl} variant="mono" />
            <span className="whitespace-nowrap text-lg font-medium tracking-[-0.02em] sm:text-2xl">
              {item.name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
