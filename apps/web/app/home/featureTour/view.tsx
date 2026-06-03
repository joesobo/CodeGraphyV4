'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../_ui/cn';
import { galleryItems } from '../content';

const AUTO_ADVANCE_MS = 5000;
const INTERACTION_COOLDOWN_MS = 2400;

export function FeatureTour(): React.ReactElement {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const activeItem = galleryItems[activeIndex] ?? galleryItems[0];
  const activeImage = useMemo(() => activeItem.image, [activeItem.image]);
  const cooldownTimeoutRef = useRef<number | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const isAutoPaused = !isInView || isHovered || isFocused || isCoolingDown;

  const pauseBriefly = useCallback(() => {
    if (cooldownTimeoutRef.current !== null) {
      window.clearTimeout(cooldownTimeoutRef.current);
    }

    setIsCoolingDown(true);
    cooldownTimeoutRef.current = window.setTimeout(() => {
      cooldownTimeoutRef.current = null;
      setIsCoolingDown(false);
    }, INTERACTION_COOLDOWN_MS);
  }, []);

  const selectFeature = useCallback((index: number) => {
    setActiveIndex(index);
    pauseBriefly();
  }, [pauseBriefly]);

  useEffect(() => {
    const section = sectionRef.current;

    if (section === null) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(Boolean(entry?.isIntersecting));
      },
      {
        root: null,
        threshold: 0.35,
      },
    );

    observer.observe(section);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isAutoPaused) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex(currentIndex => (currentIndex + 1) % galleryItems.length);
    }, AUTO_ADVANCE_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [isAutoPaused]);

  useEffect(() => () => {
    if (cooldownTimeoutRef.current !== null) {
      window.clearTimeout(cooldownTimeoutRef.current);
    }
  }, []);

  return (
    <section
      aria-label="CodeGraphy feature tour"
      className="feature-tour mt-5"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsFocused(false);
          pauseBriefly();
        }
      }}
      onFocus={() => {
        setIsFocused(true);
      }}
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        pauseBriefly();
      }}
      ref={sectionRef}
    >
      <div className="feature-tour-stage">
        <div className="feature-tour-image-wrap">
          <img
            alt={`${activeItem.title} in CodeGraphy`}
            className="feature-tour-image"
            key={activeImage}
            src={activeImage}
          />
        </div>
      </div>

      <div className="feature-tour-panel">
        <div className="flex items-center justify-between gap-3">
          <p className="section-kicker-blue text-xs font-black uppercase tracking-[0.08em]">Feature focus</p>
          <p className="text-xs font-bold text-muted-foreground">Select a view</p>
        </div>
        <div className="mt-3 grid gap-2">
          {galleryItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = index === activeIndex;

            return (
              <article
                aria-label={`Show ${item.title}`}
                aria-pressed={isActive}
                className={cn('feature-tour-option', isActive && 'feature-tour-option-active')}
                key={item.title}
                onClick={() => {
                  selectFeature(index);
                }}
                onKeyDown={event => {
                  if (event.key !== 'Enter' && event.key !== ' ') {
                    return;
                  }

                  event.preventDefault();
                  selectFeature(index);
                }}
                role="button"
                tabIndex={0}
              >
                <div className="feature-tour-option-heading">
                  <span className="icon-badge">
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block font-black text-foreground">{item.title}</span>
                  </span>
                </div>
                <p className="feature-tour-option-text">
                  {item.text}{' '}
                  {'href' in item ? (
                    <a
                      className="font-bold text-[hsl(var(--brand-blue))] underline-offset-4 hover:underline"
                      href={item.href}
                      onClick={event => {
                        event.stopPropagation();
                      }}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {item.linkLabel}
                    </a>
                  ) : null}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
