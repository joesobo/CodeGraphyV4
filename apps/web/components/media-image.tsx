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
  /** Still frame shown at rest for animated media (GIFs play on hover). */
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
 * at rest and plays while hovered or focused. When `media.darkSrc` is set,
 * the light and dark variants are both rendered and toggled by theme.
 */
export function MediaImage({ media, ...props }: MediaImageProps): React.ReactElement {
  const { darkSrc, darkPosterSrc, ...light } = media;

  if (!darkSrc) {
    return <SingleMediaImage media={light} {...props} />;
  }

  return (
    <>
      <div className="contents dark:hidden">
        <SingleMediaImage media={light} {...props} />
      </div>
      <div className="hidden dark:contents">
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
  const reduceMotion = usePrefersReducedMotion(animated);

  const playing = animated && hovered && !reduceMotion;
  // The base image is the poster when one exists; the playing GIF overlays it.
  const baseSrc = animated && posterSrc ? posterSrc : src;
  const baseLoaded = loadedSources.has(baseSrc);
  const overlaying = playing && baseSrc !== src;

  function markSourceLoaded(source: string): void {
    setLoadedSources((current) =>
      current.has(source) ? current : new Set(current).add(source),
    );
  }

  return (
    <div
      aria-describedby={animated ? descriptionId : undefined}
      className={cn('relative overflow-hidden', className)}
      onBlur={animated ? () => setHovered(false) : undefined}
      onFocus={animated ? () => setHovered(true) : undefined}
      onPointerEnter={animated ? () => setHovered(true) : undefined}
      onPointerLeave={animated ? () => setHovered(false) : undefined}
      role={animated ? 'group' : undefined}
      tabIndex={animated ? 0 : undefined}
    >
      {baseLoaded ? null : <Skeleton aria-hidden="true" className="absolute inset-0 rounded-none" />}
      {animated ? (
        <span className="sr-only" id={descriptionId}>
          {alt}.{' '}
          {reduceMotion
            ? 'Animation is paused because reduced motion is enabled.'
            : 'Animation plays while this preview is hovered or focused.'}
        </span>
      ) : null}
      <Image
        alt={alt}
        aria-hidden={overlaying ? 'true' : undefined}
        className={cn(
          'transition-opacity duration-300',
          baseLoaded ? 'opacity-100' : 'opacity-0',
          imageClassName,
        )}
        onLoad={() => markSourceLoaded(baseSrc)}
        src={baseSrc}
        {...imageProps}
      />
      {overlaying ? (
        <Image
          alt={alt}
          className={cn(
            'transition-opacity duration-150',
            loadedSources.has(src) ? 'opacity-100' : 'opacity-0',
            imageClassName,
          )}
          onLoad={() => markSourceLoaded(src)}
          src={src}
          {...imageProps}
        />
      ) : null}
    </div>
  );
}
