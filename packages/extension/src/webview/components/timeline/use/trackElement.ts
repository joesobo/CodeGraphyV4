import { useCallback, useEffect, useState, type MutableRefObject } from 'react';

export interface UseTimelineTrackElementOptions {
  trackElementRef: MutableRefObject<HTMLDivElement | null>;
}

export interface UseTimelineTrackElementResult {
  setTrackElement: (element: HTMLDivElement | null) => void;
  trackElement: HTMLDivElement | null;
  trackWidth: number;
}

export function useTimelineTrackElement({
  trackElementRef,
}: UseTimelineTrackElementOptions): UseTimelineTrackElementResult {
  const [trackElement, setTrackElementState] = useState<HTMLDivElement | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    if (!trackElement) {
      setTrackWidth(0);
      return;
    }

    if (typeof ResizeObserver === 'undefined') {
      setTrackWidth(trackElement.getBoundingClientRect().width);
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setTrackWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(trackElement);
    setTrackWidth(trackElement.getBoundingClientRect().width);

    return () => resizeObserver.disconnect();
  }, [trackElement]);

  const setTrackElement = useCallback((element: HTMLDivElement | null) => {
    trackElementRef.current = element;
    setTrackWidth(element?.getBoundingClientRect().width ?? 0);
    setTrackElementState(element);
  }, [trackElementRef]);

  return {
    setTrackElement,
    trackElement,
    trackWidth,
  };
}
