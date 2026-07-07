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
}

interface MediaImageProps
  extends Pick<ImageProps, 'fill' | 'height' | 'priority' | 'sizes' | 'width'> {
  media: Media;
  className?: string;
  imageClassName?: string;
}

/**
 * next/image with a loading skeleton. Animated media (GIFs) shows its poster
 * at rest and plays while hovered or focused.
 */
export function MediaImage({
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
  const renderedSrc = animated && !playing ? (posterSrc ?? src) : src;
  const loaded = loadedSources.has(renderedSrc);

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
      {loaded ? null : <Skeleton aria-hidden="true" className="absolute inset-0 rounded-none" />}
      {animated ? (
        <span className="sr-only" id={descriptionId}>
          {alt}.{' '}
          {reduceMotion
            ? 'Animation is paused because reduced motion is enabled.'
            : 'Animation plays while this preview is hovered or focused.'}
        </span>
      ) : null}
      <Image
        alt={animated ? '' : alt}
        className={cn(
          'transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          imageClassName,
        )}
        onLoad={() =>
          setLoadedSources((current) =>
            current.has(renderedSrc) ? current : new Set(current).add(renderedSrc),
          )
        }
        src={renderedSrc}
        {...imageProps}
      />
    </div>
  );
}
