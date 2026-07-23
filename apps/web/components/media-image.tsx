'use client';

import Image, { type ImageProps } from 'next/image';
import { useTheme } from 'next-themes';
import { useId, useState, useSyncExternalStore } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

/** An image or animation shown on the site. */
export interface Media {
  alt: string;
  src: string;
  /** Still frame shown until an animated source is requested. */
  posterSrc?: string;
  /** Dark-theme variants. Only the active theme is requested. */
  darkSrc?: string;
  darkPosterSrc?: string;
}

interface MediaImageProps
  extends Pick<ImageProps, 'fill' | 'height' | 'priority' | 'sizes' | 'width'> {
  media: Media;
  className?: string;
  imageClassName?: string;
}

interface ActiveMedia {
  alt: string;
  posterSrc?: string;
  src: string;
}

/**
 * Renders only the active theme's media. Animated sources begin loading on
 * first hover, focus, or selection. The poster stays visible until the GIF is
 * ready, then the two layers crossfade without changing layout.
 */
export function MediaImage({
  className,
  imageClassName,
  media,
  ...imageProps
}: MediaImageProps): React.ReactElement {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const activeMedia = selectActiveMedia(media, mounted && resolvedTheme === 'dark');
  const animated = activeMedia.src.endsWith('.gif');
  const descriptionId = useId();
  const [hovered, setHovered] = useState(false);
  const [playSelection, setPlaySelection] = useState<boolean | null>(null);
  const [loadedImages, setLoadedImages] = useState<ReadonlySet<string>>(() => new Set());
  const [loadedAnimations, setLoadedAnimations] = useState<ReadonlySet<string>>(() => new Set());
  const reduceMotion = usePrefersReducedMotion(animated);

  const restingSrc = animated && activeMedia.posterSrc
    ? activeMedia.posterSrc
    : activeMedia.src;
  const wantsToPlay = animated && (playSelection ?? hovered) && !reduceMotion;
  const animationLoaded = loadedAnimations.has(activeMedia.src);
  const playing = wantsToPlay && animationLoaded;
  const restingLoaded = loadedImages.has(restingSrc);

  function markImageLoaded(source: string): void {
    setLoadedImages((current) =>
      current.has(source) ? current : new Set(current).add(source),
    );
  }

  function markAnimationLoaded(source: string): void {
    setLoadedAnimations((current) =>
      current.has(source) ? current : new Set(current).add(source),
    );
  }

  const mediaLayers = mounted ? (
    <>
      {restingLoaded ? null : (
        <Skeleton aria-hidden="true" className="absolute inset-0 rounded-none" />
      )}
      <Image
        alt={activeMedia.alt}
        className={cn(
          'transition-opacity duration-200',
          restingLoaded ? 'opacity-100' : 'opacity-0',
          imageClassName,
        )}
        onLoad={() => markImageLoaded(restingSrc)}
        src={restingSrc}
        unoptimized={restingSrc.endsWith('.gif')}
        {...imageProps}
      />
      {wantsToPlay ? (
        // Animated GIFs use a native image element so the browser owns one
        // continuous decode and playback lifecycle from load through display.
        <img
          alt=""
          aria-hidden="true"
          className={cn(
            imageProps.fill && 'absolute inset-0 size-full',
            animationLoaded ? 'opacity-100' : 'opacity-0',
            imageClassName,
          )}
          decoding="async"
          height={imageProps.fill ? undefined : imageProps.height}
          onLoad={() => markAnimationLoaded(activeMedia.src)}
          sizes={imageProps.sizes}
          src={activeMedia.src}
          width={imageProps.fill ? undefined : imageProps.width}
        />
      ) : null}
      {animated && !reduceMotion ? (
        <span
          aria-hidden="true"
          className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full border border-white/24 bg-[#071421]/82 text-xs text-white shadow-sm backdrop-blur-sm"
        >
          {wantsToPlay && !animationLoaded ? '…' : playing ? 'Ⅱ' : '▶'}
        </span>
      ) : null}
    </>
  ) : (
    <Skeleton aria-hidden="true" className="absolute inset-0 rounded-none" />
  );

  if (!animated || reduceMotion) {
    return (
      <div
        aria-describedby={animated ? descriptionId : undefined}
        className={cn('relative overflow-hidden', className)}
      >
        {animated ? (
          <span className="sr-only" id={descriptionId}>
            {activeMedia.alt}. Animation is paused because reduced motion is enabled.
          </span>
        ) : null}
        {mediaLayers}
      </div>
    );
  }

  return (
    <button
      aria-describedby={descriptionId}
      aria-label={
        wantsToPlay && !animationLoaded
          ? `Loading ${activeMedia.alt}`
          : `${playing ? 'Pause' : 'Play'} ${activeMedia.alt}`
      }
      aria-pressed={wantsToPlay}
      className={cn(
        'relative block w-full overflow-hidden border-0 p-0 text-left transition-transform duration-200 active:scale-[0.99]',
        className,
      )}
      onBlur={() => {
        setHovered(false);
        setPlaySelection(null);
      }}
      onClick={() => setPlaySelection(!wantsToPlay)}
      onPointerEnter={() => {
        setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      type="button"
    >
      <span className="sr-only" id={descriptionId}>
        Hover or select to load and play. Select again to pause.
      </span>
      {mediaLayers}
    </button>
  );
}

function selectActiveMedia(media: Media, dark: boolean): ActiveMedia {
  if (dark && media.darkSrc) {
    return {
      alt: media.alt,
      posterSrc: media.darkPosterSrc,
      src: media.darkSrc,
    };
  }

  return {
    alt: media.alt,
    posterSrc: media.posterSrc,
    src: media.src,
  };
}

function useMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, getMountedSnapshot, getServerSnapshot);
}

const emptySubscribe = (): (() => void) => () => {};
const getMountedSnapshot = (): boolean => true;
const getServerSnapshot = (): boolean => false;
