const LABEL_FONT = '12px Sans-Serif';
const LABEL_HEIGHT = 15;
const LABEL_HORIZONTAL_PADDING = 2;

export interface NodeLabelSprite {
  readonly cssHeight: number;
  readonly cssWidth: number;
  readonly image: CanvasImageSource;
}

export interface NodeLabelSpriteProvider {
  get(text: string, color: string, devicePixelRatio: number): NodeLabelSprite;
}

type CanvasFactory = () => HTMLCanvasElement;

export class NodeLabelSpriteCache implements NodeLabelSpriteProvider {
  private readonly sprites = new Map<string, NodeLabelSprite>();

  constructor(
    private readonly capacity = 2_048,
    private readonly createCanvas: CanvasFactory = () => document.createElement('canvas'),
  ) {}

  private rasterize(text: string, color: string, devicePixelRatio: number): NodeLabelSprite {
    const canvas = this.createCanvas();
    const measurementContext = canvas.getContext('2d');
    if (!measurementContext) throw new Error('Canvas 2D is unavailable for graph labels');
    measurementContext.font = LABEL_FONT;
    const cssWidth = Math.ceil(measurementContext.measureText(text).width)
      + LABEL_HORIZONTAL_PADDING;
    canvas.width = Math.max(1, Math.ceil(cssWidth * devicePixelRatio));
    canvas.height = Math.ceil(LABEL_HEIGHT * devicePixelRatio);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable for graph labels');
    context.scale(devicePixelRatio, devicePixelRatio);
    context.fillStyle = color;
    context.font = LABEL_FONT;
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.fillText(text, LABEL_HORIZONTAL_PADDING / 2, 0);
    return { cssHeight: LABEL_HEIGHT, cssWidth, image: canvas };
  }

  get(text: string, color: string, devicePixelRatio: number): NodeLabelSprite {
    const scale = Math.max(1, devicePixelRatio);
    const key = `${scale}\u0000${color}\u0000${text}`;
    const cached = this.sprites.get(key);
    if (cached) {
      this.sprites.delete(key);
      this.sprites.set(key, cached);
      return cached;
    }
    const sprite = this.rasterize(text, color, scale);
    this.sprites.set(key, sprite);
    if (this.sprites.size > this.capacity) {
      this.sprites.delete(this.sprites.keys().next().value as string);
    }
    return sprite;
  }
}
