import { rasterizeNodeLabelSprite } from './labelSpriteRaster';

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
    const created = rasterizeNodeLabelSprite(this.createCanvas, text, color, scale);
    if (created.backingBytes > this.byteCapacity) return created.sprite;
    this.sprites.set(key, created);
    this.retainedBytes += created.backingBytes;
    while (this.sprites.size > this.capacity || this.retainedBytes > this.byteCapacity) {
      this.evictOldest();
    }
    return created.sprite;
  }
}
