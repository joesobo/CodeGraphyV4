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
  const [pressed, setPressed] = useState(false);
  const reduceMotion = usePrefersReducedMotion(animated);

  const playing = animated && (hovered || pressed) && !reduceMotion;
  // The base image is the poster when one exists; the playing GIF overlays it.
  const baseSrc = animated && posterSrc ? posterSrc : src;
  const baseLoaded = loadedSources.has(baseSrc);
  const overlaying = playing && baseSrc !== src;

  function markSourceLoaded(source: string): void {
    setLoadedSources((current) =>
      current.has(source) ? current : new Set(current).add(source),
    );
  }

  const mediaLayers = (
    <>
      {baseLoaded ? null : <Skeleton aria-hidden="true" className="absolute inset-0 rounded-none" />}
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
        unoptimized={animated && baseSrc === src}
        {...imageProps}
      />
      {overlaying ? (
        <Image
          alt=""
          className={cn(
            'transition-opacity duration-150',
            loadedSources.has(src) ? 'opacity-100' : 'opacity-0',
            imageClassName,
          )}
          onLoad={() => markSourceLoaded(src)}
          src={src}
          unoptimized
          {...imageProps}
        />
      ) : null}
      {animated && !reduceMotion ? (
        <span
          aria-hidden="true"
          className="absolute right-3 bottom-3 rounded-full border border-white/18 bg-[#071421]/88 px-3 py-1.5 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white shadow-sm backdrop-blur-sm"
        >
          {playing ? 'Playing' : 'Play preview'}
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
        'relative block overflow-hidden border-0 p-0 text-left transition-transform duration-200 active:scale-[0.99]',
        className,
      )}
      onBlur={() => {
        setHovered(false);
        setPressed(false);
      }}
      onClick={() => setPressed((current) => !current)}
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
