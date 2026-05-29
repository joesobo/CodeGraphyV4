export interface RectangularNodeArea2D {
  height: number;
  width: number;
}

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function getRectangularNodeArea2D(area: unknown): RectangularNodeArea2D | undefined {
  if (
    !area
    || typeof area !== 'object'
    || !isFinitePositiveNumber((area as RectangularNodeArea2D).height)
    || !isFinitePositiveNumber((area as RectangularNodeArea2D).width)
  ) {
    return undefined;
  }

  return {
    height: (area as RectangularNodeArea2D).height,
    width: (area as RectangularNodeArea2D).width,
  };
}

export function getRectangularNodeAreaRadius(area: RectangularNodeArea2D): number {
  return Math.hypot(area.height, area.width) / 2;
}
