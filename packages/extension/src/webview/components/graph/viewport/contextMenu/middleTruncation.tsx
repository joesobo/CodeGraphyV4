import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { cn } from '../../../ui/cn';

const ELLIPSIS = '…';

type MeasureText = (value: string) => number;

interface GraphemeSegmenter {
  segment(value: string): Iterable<{ segment: string }>;
}

interface GraphemeSegmenterConstructor {
  new (locales?: string | string[], options?: { granularity: 'grapheme' }): GraphemeSegmenter;
}

function splitGraphemes(text: string): string[] {
  const Segmenter = (Intl as typeof Intl & { Segmenter?: GraphemeSegmenterConstructor }).Segmenter;
  if (!Segmenter) return Array.from(text);
  return Array.from(
    new Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
    entry => entry.segment,
  );
}

export function middleTruncateText(
  text: string,
  maxWidth: number,
  measureText: MeasureText,
): string {
  if (maxWidth <= 0 || measureText(text) <= maxWidth) return text;
  if (measureText(ELLIPSIS) > maxWidth) return ELLIPSIS;

  const characters = splitGraphemes(text);
  let lower = 0;
  let upper = characters.length;
  let best = ELLIPSIS;

  while (lower <= upper) {
    const visibleCharacters = Math.floor((lower + upper) / 2);
    const startLength = Math.ceil(visibleCharacters / 2);
    const endLength = Math.floor(visibleCharacters / 2);
    const start = characters.slice(0, startLength).join('');
    const end = endLength > 0 ? characters.slice(-endLength).join('') : '';
    const candidate = `${start}${ELLIPSIS}${end}`;

    if (measureText(candidate) <= maxWidth) {
      best = candidate;
      lower = visibleCharacters + 1;
    } else {
      upper = visibleCharacters - 1;
    }
  }

  return best;
}

function measureForElement(element: HTMLElement): MeasureText | undefined {
  const canvas = element.ownerDocument.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  context.font = getComputedStyle(element).font;
  return value => context.measureText(value).width;
}

export function MiddleTruncatedText({
  text,
  className,
  tooltipText = text,
}: {
  className?: string;
  text: string;
  tooltipText?: string;
}): ReactElement {
  const elementRef = useRef<HTMLSpanElement>(null);
  const [displayText, setDisplayText] = useState(text);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const update = (): void => {
      const width = element.clientWidth;
      if (width <= 0) {
        setDisplayText(text);
        return;
      }
      const measureText = measureForElement(element);
      setDisplayText(measureText ? middleTruncateText(text, width, measureText) : text);
    };

    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text]);

  const truncated = displayText !== text;
  return (
    <span
      ref={elementRef}
      className={cn('block min-w-0 overflow-hidden whitespace-nowrap', className)}
      data-truncated={truncated ? 'true' : undefined}
      title={truncated ? tooltipText : undefined}
    >
      {displayText}
    </span>
  );
}
