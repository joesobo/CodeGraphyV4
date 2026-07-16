export function canvasSize(canvas: HTMLCanvasElement): { width: number; height: number } {
  const bounds = canvas.getBoundingClientRect();
  return { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) };
}

export interface CanvasPointerGeometry {
  height: number;
  width: number;
  x: number;
  y: number;
}

export function canvasPointerGeometry(
  canvas: HTMLCanvasElement,
  event: Pick<PointerEvent | WheelEvent | MouseEvent, 'clientX' | 'clientY'>,
): CanvasPointerGeometry {
  const bounds = canvas.getBoundingClientRect();
  return {
    height: Math.max(1, bounds.height),
    width: Math.max(1, bounds.width),
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  };
}
