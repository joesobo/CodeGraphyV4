'use client';

import type { RefObject } from 'react';
import { useEffect } from 'react';

export function useScrollActiveNavItemIntoView<TElement extends HTMLElement>(
  itemRef: RefObject<TElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      scrollActiveNavItemIntoView(itemRef.current);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [active, itemRef]);
}

function scrollActiveNavItemIntoView(item: HTMLElement | null): void {
  const scrollArea = item?.closest<HTMLElement>('[data-sidebar-content]');

  if (!item || !scrollArea) {
    return;
  }

  const itemRect = item.getBoundingClientRect();
  const areaRect = scrollArea.getBoundingClientRect();
  const topOverflow = itemRect.top - areaRect.top;
  const bottomOverflow = itemRect.bottom - areaRect.bottom;

  if (topOverflow < 0) {
    scrollArea.scrollTop += topOverflow - 8;
  } else if (bottomOverflow > 0) {
    scrollArea.scrollTop += bottomOverflow + 8;
  }
}
