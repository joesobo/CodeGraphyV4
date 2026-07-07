'use client';

import { useEffect, useState } from 'react';

// A section is active while it intersects the band just below the sticky
// header. The band starts at 80px so a section that was just jumped to via
// its anchor (scroll-margin-top: 5.5rem) still counts as intersecting.
const observerOptions: IntersectionObserverInit = {
  rootMargin: '-80px 0px -60% 0px',
  threshold: [0, 0.1, 0.4],
};

// Viewport offset (sticky header plus breathing room) used when no section
// intersects the band, e.g. between widely spaced sections.
const passedSectionOffsetPx = 160;

/** Tracks which section href is active while the page scrolls. */
export function useScrollSpy(
  sectionHrefs: readonly string[],
): [string | undefined, (href: string) => void] {
  const [activeHref, setActiveHref] = useState<string | undefined>(sectionHrefs[0]);

  useEffect(() => {
    const hrefsByElement = new Map<Element, string>();

    for (const href of sectionHrefs) {
      const element = getSectionElement(href);

      if (element && !hrefsByElement.has(element)) {
        hrefsByElement.set(element, href);
      }
    }

    if (hrefsByElement.size === 0 || typeof IntersectionObserver === 'undefined') {
      setActiveHref(sectionHrefs[0]);
      return;
    }

    const visibleTops = new Map<string, number>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const href = hrefsByElement.get(entry.target);

        if (!href) {
          continue;
        }

        if (entry.isIntersecting) {
          visibleTops.set(href, entry.boundingClientRect.top);
        } else {
          visibleTops.delete(href);
        }
      }

      const topmostHref = [...visibleTops.entries()].sort(
        ([, leftTop], [, rightTop]) => leftTop - rightTop,
      )[0]?.[0];

      // Sections laid out in grid rows tie on scroll position, so keep the
      // current section (e.g. the one just clicked) while it stays in the band.
      setActiveHref((current) =>
        current && visibleTops.has(current)
          ? current
          : (topmostHref ?? getPassedSectionHref(sectionHrefs)),
      );
    }, observerOptions);

    for (const element of hrefsByElement.keys()) {
      observer.observe(element);
    }

    setActiveHref(getPassedSectionHref(sectionHrefs));

    return () => observer.disconnect();
  }, [sectionHrefs]);

  return [activeHref, setActiveHref];
}

function getSectionElement(href: string): HTMLElement | null {
  const hashIndex = href.indexOf('#');

  if (hashIndex < 0 || hashIndex === href.length - 1) {
    return null;
  }

  return document.getElementById(decodeURIComponent(href.slice(hashIndex + 1)));
}

/** The last section whose top has scrolled past the header — the one being read. */
function getPassedSectionHref(sectionHrefs: readonly string[]): string | undefined {
  let activeHref = sectionHrefs[0];

  for (const href of sectionHrefs) {
    const section = getSectionElement(href);

    if (section && section.getBoundingClientRect().top <= passedSectionOffsetPx) {
      activeHref = href;
    }
  }

  return activeHref;
}
