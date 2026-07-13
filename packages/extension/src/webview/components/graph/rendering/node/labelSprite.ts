const LABEL_FONT = '12px Sans-Serif';
const LABEL_FALLBACK_ASCENT = 11;
const LABEL_FALLBACK_DESCENT = 2;
const LABEL_PADDING = 2;
const DEFAULT_CACHE_BYTES = 24 * 1_024 * 1_024;

export interface NodeLabelSprite {
  readonly cssHeight: number;
  readonly cssWidth: number;
  readonly image: CanvasImageSource;
}

export interface NodeLabelSpriteProvider {
  get(text: string, color: string, devicePixelRatio: number): NodeLabelSprite;
}

interface CachedSprite {
  readonly backingBytes: number;
  readonly sprite: NodeLabelSprite;
}

type CanvasFactory = () => HTMLCanvasElement;

export class NodeLabelSpriteCache implements NodeLabelSpriteProvider {
  private readonly sprites = new Map<string, CachedSprite>();
  private retainedBytes = 0;

  constructor(
    private readonly capacity = 2_048,
    private readonly createCanvas: CanvasFactory = () => document.createElement('canvas'),
    private readonly byteCapacity = DEFAULT_CACHE_BYTES,
  ) {}

  private rasterize(text: string, color: string, devicePixelRatio: number): CachedSprite {
    const canvas = this.createCanvas();
    const measurementContext = canvas.getContext('2d');
    if (!measurementContext) throw new Error('Canvas 2D is unavailable for graph labels');
    measurementContext.font = LABEL_FONT;
    const metrics = measurementContext.measureText(text);
    const left = Number.isFinite(metrics.actualBoundingBoxLeft)
      ? metrics.actualBoundingBoxLeft
      : 0;
    const right = Number.isFinite(metrics.actualBoundingBoxRight)
      ? metrics.actualBoundingBoxRight
      : metrics.width;
    const ascent = Number.isFinite(metrics.actualBoundingBoxAscent)
      ? metrics.actualBoundingBoxAscent
      : LABEL_FALLBACK_ASCENT;
    const descent = Number.isFinite(metrics.actualBoundingBoxDescent)
      ? metrics.actualBoundingBoxDescent
      : LABEL_FALLBACK_DESCENT;
    const cssWidth = Math.ceil(Math.max(metrics.width, left + right)) + LABEL_PADDING;
    const cssHeight = Math.ceil(ascent + descent) + LABEL_PADDING;
    canvas.width = Math.max(1, Math.ceil(cssWidth * devicePixelRatio));
    canvas.height = Math.max(1, Math.ceil(cssHeight * devicePixelRatio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable for graph labels');
    context.scale(devicePixelRatio, devicePixelRatio);
    context.fillStyle = color;
    context.font = LABEL_FONT;
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(text, LABEL_PADDING / 2 + left, LABEL_PADDING / 2 + ascent);
    return {
      backingBytes: canvas.width * canvas.height * 4,
      sprite: { cssHeight, cssWidth, image: canvas },
    };
  }

  private evictOldest(): void {
    const key = this.sprites.keys().next().value;
    if (key === undefined) return;
    const removed = this.sprites.get(key);
    this.sprites.delete(key);
    this.retainedBytes -= removed?.backingBytes ?? 0;
  }

  get(text: string, color: string, devicePixelRatio: number): NodeLabelSprite {
    const scale = Math.max(1, devicePixelRatio);
    const key = `${scale}\u0000${color}\u0000${text}`;
    const cached = this.sprites.get(key);
    if (cached) {
      this.sprites.delete(key);
      this.sprites.set(key, cached);
      return cached.sprite;
    }
    const created = this.rasterize(text, color, scale);
    if (created.backingBytes > this.byteCapacity) return created.sprite;
    this.sprites.set(key, created);
    this.retainedBytes += created.backingBytes;
    while (this.sprites.size > this.capacity || this.retainedBytes > this.byteCapacity) {
      this.evictOldest();
    }
    return created.sprite;
  }
}
