import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCssColorResolver,
  markCssColorsChanged,
} from '../../../src/webview/cssColors/resolver';

const computed = new Map<string, string>();
const pixels = new Map<string, [number, number, number, number]>();
let appendProbe: ReturnType<typeof vi.fn>;
let removeProbe: ReturnType<typeof vi.fn>;
let appendedContext: Element | null;
let canvasFillStyle: string;
let canvasReadCount: number;

function resolver(contextElement?: () => Element | null) {
  const probe = {
    remove: removeProbe,
    style: { color: '' },
  } as unknown as HTMLElement;
  const canvasContext = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    get fillStyle() { return canvasFillStyle; },
    set fillStyle(value: string) { canvasFillStyle = value; },
    getImageData: vi.fn(() => {
      canvasReadCount += 1;
      return { data: Uint8ClampedArray.from(pixels.get(canvasFillStyle) ?? [0, 0, 0, 0]) };
    }),
  } as unknown as CanvasRenderingContext2D;
  const canvas = {
    getContext: vi.fn(() => canvasContext),
    height: 1,
    width: 1,
  } as unknown as HTMLCanvasElement;
  const body = {
    appendChild: vi.fn((element: Element) => {
      appendedContext = body as unknown as Element;
      appendProbe(element);
    }),
  } as unknown as HTMLElement;
  const ownerDocument = {
    body,
    createElement: vi.fn((tagName: string) => tagName === 'canvas' ? canvas : probe),
  } as unknown as Document;
  const ownerWindow = {
    getComputedStyle: (element: Element) => ({
      color: computed.get(`${(appendedContext as HTMLElement | null)?.dataset?.scope ?? 'body'}:${(element as HTMLElement).style.color}`)
        ?? computed.get((element as HTMLElement).style.color)
        ?? '',
    } as CSSStyleDeclaration),
  } as unknown as Window;
  const appendToContext = (element: Element): void => {
    appendedContext = contextElement?.() ?? body;
    appendProbe(element);
  };
  if (contextElement) {
    const original = contextElement;
    contextElement = () => {
      const context = original();
      if (context) (context as HTMLElement).appendChild = appendToContext as never;
      return context;
    };
  }
  return createCssColorResolver(ownerDocument, ownerWindow, contextElement);
}

describe('webview/cssColors/resolver', () => {
  beforeEach(() => {
    computed.clear();
    pixels.clear();
    appendProbe = vi.fn();
    removeProbe = vi.fn();
    appendedContext = null;
    canvasFillStyle = '';
    canvasReadCount = 0;
  });

  it.each([
    ['gold', 'rgb(255, 215, 0)'],
    ['hsl(120 100% 25%)', 'rgb(0, 128, 0)'],
    ['rgb(100% 0% 50% / 25%)', 'rgba(255, 0, 128, 0.25)'],
    ['var(--plugin-accent)', 'rgb(12, 34, 56)'],
    ['currentcolor', 'rgb(210, 220, 230)'],
    ['Canvas', 'rgb(30, 30, 30)'],
    ['color-mix(in srgb, red 70%, transparent)', 'color(srgb 1 0 0 / 0.7)'],
  ])('resolves browser CSS color %s to a computed renderer color', (input, output) => {
    computed.set(input, output);

    expect(resolver().resolve(input, '#010203')).toBe(output);
  });

  it.each([
    ['oklch(50% 0.2 30 / 50%)', 'oklch(0.5 0.2 30 / 0.5)', [190, 20, 30, 128], 'rgba(190, 20, 30, 0.502)'],
    ['lab(60% 80 70)', 'lab(60 80 70)', [255, 61, 0, 255], 'rgba(255, 61, 0, 1)'],
    ['color(display-p3 1 0.2 0)', 'color(display-p3 1 0.2 0)', [255, 0, 0, 255], 'rgba(255, 0, 0, 1)'],
  ] as const)('converts browser color %s to concrete sRGB', (input, browserColor, rgba, output) => {
    computed.set(input, browserColor);
    pixels.set(browserColor, [...rgba]);

    expect(resolver().resolve(input, '#010203')).toBe(output);
  });

  it('falls back intentionally when a color is invalid or an unresolved variable has no computed value', () => {
    const colorResolver = resolver();

    expect(colorResolver.resolve('not-a-color', '#010203')).toBe('#010203');
    expect(colorResolver.resolve('rgb(1..2, 0, 0)', '#010203')).toBe('#010203');
    expect(colorResolver.resolve('#12345', '#010203')).toBe('#010203');
    expect(colorResolver.resolve('var(--missing)', '#040506')).toBe('#040506');
  });

  it('resolves inherited colors in the current Graph View context and invalidates when it changes', () => {
    const first = document.createElement('section');
    first.dataset.scope = 'first';
    const second = document.createElement('section');
    second.dataset.scope = 'second';
    let context: Element | null = first;
    computed.set('first:currentcolor', 'rgb(1, 2, 3)');
    computed.set('second:currentcolor', 'rgb(4, 5, 6)');
    const colorResolver = resolver(() => context);

    expect(colorResolver.resolve('currentcolor', '#000000')).toBe('rgb(1, 2, 3)');
    context = second;
    expect(colorResolver.resolve('currentcolor', '#000000')).toBe('rgb(4, 5, 6)');
  });

  it('passes renderer-native colors through without a DOM probe', () => {
    const colorResolver = resolver();

    expect(colorResolver.resolve('#AABBCC', '#000000')).toBe('#AABBCC');
    expect(colorResolver.resolve('rgba(1, 2, 3, 0.5)', '#000000')).toBe('rgba(1, 2, 3, 0.5)');
    expect(appendProbe).not.toHaveBeenCalled();
  });

  it('caches computed colors until an injected stylesheet changes', () => {
    computed.set('gold', 'rgb(255, 215, 0)');
    const colorResolver = resolver();

    expect(colorResolver.resolve('gold', '#000000')).toBe('rgb(255, 215, 0)');
    computed.set('gold', 'rgb(1, 2, 3)');
    expect(colorResolver.resolve('gold', '#000000')).toBe('rgb(255, 215, 0)');

    markCssColorsChanged();

    expect(colorResolver.resolve('gold', '#000000')).toBe('rgb(1, 2, 3)');
  });

  it('evicts only the least-recently-used computed color at capacity', () => {
    const colorResolver = resolver();
    for (let index = 0; index <= 1_024; index += 1) {
      const color = `plugin-color-${index}`;
      computed.set(color, `rgb(${index % 255}, 0, 0)`);
      colorResolver.resolve(color, '#000000');
    }
    const readsAfterCapacity = appendProbe.mock.calls.length;

    colorResolver.resolve('plugin-color-1', '#000000');
    expect(appendProbe).toHaveBeenCalledTimes(readsAfterCapacity);
    colorResolver.resolve('plugin-color-0', '#000000');
    expect(appendProbe).toHaveBeenCalledTimes(readsAfterCapacity + 1);
  });

  it('caches converted color-space results instead of repeatedly reading pixels', () => {
    computed.set('oklch(50% 0.2 30)', 'oklch(0.5 0.2 30)');
    pixels.set('oklch(0.5 0.2 30)', [10, 20, 30, 255]);
    const colorResolver = resolver();

    colorResolver.resolve('oklch(50% 0.2 30)', '#000000');
    colorResolver.resolve('oklch(50% 0.2 30)', '#000000');

    expect(canvasReadCount).toBe(1);
  });

  it('removes its temporary probe after resolving a color', () => {
    computed.set('gold', 'rgb(255, 215, 0)');

    resolver().resolve('gold', '#000000');

    expect(removeProbe).toHaveBeenCalledOnce();
  });
});
