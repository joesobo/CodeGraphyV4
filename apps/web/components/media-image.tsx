'use client';

import Image, { type ImageProps } from 'next/image';
import { useId, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

/** An image or animation shown on the site, rendered by MediaImage. */
export interface Media {
  alt: string;
  src: string;
  /** Still frame shown at rest for animated media (GIFs play on hover or selection). */
  posterSrc?: string;
  /** Dark-theme variant; when set, MediaImage renders both and the theme picks one. */
  darkSrc?: string;
  darkPosterSrc?: string;
}

interface MediaImageProps
  extends Pick<ImageProps, 'fill' | 'height' | 'priority' | 'sizes' | 'width'> {
  media: Media;
  className?: string;
  imageClassName?: string;
}

/**
 * next/image with a loading skeleton. Animated media (GIFs) shows its poster
 * at rest and plays while hovered or selected. When `media.darkSrc` is set,
 * the light and dark variants are both rendered and toggled by theme.
 */
export function MediaImage({ media, ...props }: MediaImageProps): React.ReactElement {
  const { darkSrc, darkPosterSrc, ...light } = media;

  if (!darkSrc) {
    return <SingleMediaImage media={light} {...props} />;
  }

  return (
    <>
      <div className="w-full dark:hidden">
        <SingleMediaImage media={light} {...props} />
      </div>
      <div className="hidden w-full dark:block">
        <SingleMediaImage
          media={{ alt: light.alt, src: darkSrc, posterSrc: darkPosterSrc }}
          {...props}
        />
      </div>
    </>
  );
}

function SingleMediaImage({
  className,
  imageClassName,
  media,
  ...imageProps
}: MediaImageProps): React.ReactElement {
  const { alt, src, posterSrc } = media;
  const animated = src.endsWith('.gif');

  const descriptionId = useId();
  const [loadedSources, setLoadedSources] = useState<ReadonlySet<string>>(() => new Set());
  const [hovered, setHovered] = useState(false);
  const [playSelection, setPlaySelection] = useState<boolean | null>(null);
  const reduceMotion = usePrefersReducedMotion(animated);

  const playing = animated && (playSelection ?? hovered) && !reduceMotion;
  const activeSrc = animated && !playing && posterSrc ? posterSrc : src;
  const activeLoaded = loadedSources.has(activeSrc);

  function markSourceLoaded(source: string): void {
    setLoadedSources((current) =>
      current.has(source) ? current : new Set(current).add(source),
    );
  }

  const animatedImageProps = {
    priority: imageProps.priority,
    sizes: imageProps.sizes,
  } satisfies Pick<ImageProps, 'priority' | 'sizes'>;

  const mediaLayers = (
    <>
      {activeLoaded ? null : <Skeleton aria-hidden="true" className="absolute inset-0 rounded-none" />}
      {animated ? (
        <Image
          alt={alt}
          className={cn(
            'transition-opacity duration-200',
            activeLoaded ? 'opacity-100' : 'opacity-0',
            imageClassName,
          )}
          fill
          key={activeSrc}
          onLoad={() => markSourceLoaded(activeSrc)}
          src={activeSrc}
          unoptimized={activeSrc.endsWith('.gif')}
          {...animatedImageProps}
        />
      ) : (
        <Image
          alt={alt}
          className={cn(
            'transition-opacity duration-200',
            activeLoaded ? 'opacity-100' : 'opacity-0',
            imageClassName,
          )}
          onLoad={() => markSourceLoaded(activeSrc)}
          src={activeSrc}
          {...imageProps}
        />
      )}
      {animated && !reduceMotion ? (
        <span
          aria-hidden="true"
          className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full border border-white/24 bg-[#071421]/82 text-xs text-white shadow-sm backdrop-blur-sm"
        >
          {playing ? 'Ⅱ' : '▶'}
        </span>
      ) : null}
    </>
  );

  if (!animated || reduceMotion) {
    return (
      <div
        aria-describedby={animated ? descriptionId : undefined}
        className={cn('relative overflow-hidden', className)}
      >
        {animated ? (
          <span className="sr-only" id={descriptionId}>
            {alt}. Animation is paused because reduced motion is enabled.
          </span>
        ) : null}
        {mediaLayers}
      </div>
    );
  }

  return (
    <button
      aria-describedby={descriptionId}
      aria-label={`${playing ? 'Pause' : 'Play'} ${alt}`}
      aria-pressed={playing}
      className={cn(
        'relative block w-full overflow-hidden border-0 p-0 text-left transition-transform duration-200 active:scale-[0.99]',
        className,
      )}
      onBlur={() => {
        setHovered(false);
        setPlaySelection(null);
      }}
      onClick={() => setPlaySelection(!playing)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      type="button"
    >
      <span className="sr-only" id={descriptionId}>
        Hover or select to play. Select again to pause.
      </span>
      {mediaLayers}
    </button>
  );
}
