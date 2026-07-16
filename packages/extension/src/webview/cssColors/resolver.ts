type ColorDocument = Pick<Document, 'body' | 'createElement'>;
type ColorWindow = Pick<Window, 'getComputedStyle'>;
type ColorContextProvider = () => Element | null;

export interface CssColorResolver {
  resolve: (value: string | undefined, fallback: string, context?: Element | null) => string;
}

export const CSS_COLORS_CHANGED_EVENT = 'codegraphy:css-colors-changed';

const MAX_CACHED_COLORS = 1_024;
let stylesheetRevision = 0;

function defaultDocument(): Document | undefined {
  return globalThis.document;
}

function defaultWindow(): Window | undefined {
  return globalThis.window;
}

const CSS_NUMBER = '(?:\\d+(?:\\.\\d+)?|\\.\\d+)';
const RENDERER_RGB_COLOR = new RegExp(
  `^rgba?\\(\\s*${CSS_NUMBER}(?:\\s*[, ]\\s*${CSS_NUMBER}){2}(?:\\s*[,/]\\s*${CSS_NUMBER})?\\s*\\)$`,
  'i',
);
const RENDERER_SRGB_COLOR = new RegExp(
  `^color\\(\\s*srgb\\s+${CSS_NUMBER}\\s+${CSS_NUMBER}\\s+${CSS_NUMBER}(?:\\s*\\/\\s*${CSS_NUMBER})?\\s*\\)$`,
  'i',
);

function isRendererColor(value: string): boolean {
  return /^#[\da-f]{3}(?:[\da-f]|[\da-f]{3}|[\da-f]{5})?$/i.test(value)
    || RENDERER_RGB_COLOR.test(value)
    || RENDERER_SRGB_COLOR.test(value)
    || value.toLowerCase() === 'transparent';
}

function formatAlpha(alphaByte: number): string {
  return String(Math.round((alphaByte / 255) * 1_000) / 1_000);
}

interface SrgbCanvas {
  context: CanvasRenderingContext2D;
}

function createSrgbCanvas(ownerDocument: ColorDocument): SrgbCanvas | undefined {
  if (ownerDocument === globalThis.document
    && typeof globalThis.CanvasRenderingContext2D === 'undefined') return undefined;
  const canvas = ownerDocument.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { colorSpace: 'srgb' });
  return context ? { context } : undefined;
}

function convertToSrgb(value: string, canvas: SrgbCanvas | undefined): string | null {
  if (!canvas) return null;
  const { context } = canvas;
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  return `rgba(${red}, ${green}, ${blue}, ${formatAlpha(alpha)})`;
}

function normalizedComputedColor(
  value: string,
  ownerDocument: ColorDocument,
  ownerWindow: ColorWindow,
  context: Element,
  canvas: SrgbCanvas | undefined,
): string | null {
  const trimmed = value.trim();
  if (isRendererColor(trimmed)) return trimmed;
  const probe = ownerDocument.createElement('span');
  probe.style.color = trimmed;
  if (probe.style.color === '') return null;
  context.appendChild(probe);
  try {
    const computed = ownerWindow.getComputedStyle(probe).color.trim();
    if (!computed) return null;
    return isRendererColor(computed) ? computed : convertToSrgb(computed, canvas);
  } finally {
    probe.remove();
  }
}

function readCached(cache: Map<string, string>, key: string): string | undefined {
  const value = cache.get(key);
  if (value === undefined) return undefined;
  cache.delete(key);
  cache.set(key, value);
  return value;
}

function cacheResolvedColor(cache: Map<string, string>, key: string, value: string): void {
  if (cache.size >= MAX_CACHED_COLORS) {
    const leastRecentlyUsed = cache.keys().next().value;
    if (leastRecentlyUsed !== undefined) cache.delete(leastRecentlyUsed);
  }
  cache.set(key, value);
}

export function cssColorRevision(): number {
  return stylesheetRevision;
}

export function markCssColorsChanged(): void {
  stylesheetRevision += 1;
  globalThis.window?.dispatchEvent(new Event(CSS_COLORS_CHANGED_EVENT));
}

class BrowserCssColorResolver implements CssColorResolver {
  private cachedContext: Element | null | undefined;
  private cachedRevision = stylesheetRevision;
  private srgbCanvas: SrgbCanvas | undefined;
  private readonly cache = new Map<string, string>();

  constructor(
    private readonly ownerDocument: ColorDocument | null | undefined,
    private readonly ownerWindow: ColorWindow | null | undefined,
    private readonly contextProvider: ColorContextProvider | undefined,
  ) {}

  resolve(value: string | undefined, fallback: string, contextOverride?: Element | null): string {
    if (!value) return fallback;
    const context = this.resolveContext(contextOverride);
    if (!context || !this.ownerDocument || !this.ownerWindow) return fallback;
    this.refreshCache(context);
    return this.resolveCached(
      value,
      fallback,
      context,
      this.ownerDocument,
      this.ownerWindow,
    );
  }

  private resolveContext(contextOverride: Element | null | undefined): Element | null {
    if (!this.ownerDocument?.body || !this.ownerWindow) return null;
    return contextOverride ?? this.contextProvider?.() ?? this.ownerDocument.body;
  }

  private refreshCache(context: Element): void {
    if (this.cachedRevision === stylesheetRevision && this.cachedContext === context) return;
    this.cache.clear();
    this.cachedContext = context;
    this.cachedRevision = stylesheetRevision;
  }

  private resolveCached(
    value: string,
    fallback: string,
    context: Element,
    ownerDocument: ColorDocument,
    ownerWindow: ColorWindow,
  ): string {
    const key = `${value}\u0000${fallback}`;
    const cached = readCached(this.cache, key);
    if (cached !== undefined) return cached;
    this.srgbCanvas ??= createSrgbCanvas(ownerDocument);
    const resolved = normalizedComputedColor(
      value,
      ownerDocument,
      ownerWindow,
      context,
      this.srgbCanvas,
    ) ?? fallback;
    cacheResolvedColor(this.cache, key, resolved);
    return resolved;
  }
}

export function createCssColorResolver(
  ownerDocument: ColorDocument | null | undefined = defaultDocument(),
  ownerWindow: ColorWindow | null | undefined = defaultWindow(),
  contextProvider?: ColorContextProvider,
): CssColorResolver {
  return new BrowserCssColorResolver(ownerDocument, ownerWindow, contextProvider);
}

let defaultResolver: CssColorResolver | undefined;

export function resolveCssColor(
  value: string | undefined,
  fallback: string,
  context?: Element | null,
): string {
  defaultResolver ??= createCssColorResolver();
  return defaultResolver.resolve(value, fallback, context);
}
