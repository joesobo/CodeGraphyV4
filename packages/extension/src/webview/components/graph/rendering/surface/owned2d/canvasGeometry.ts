export function canvasSize(canvas: HTMLCanvasElement): { width: number; height: number } {
  const bounds = canvas.getBoundingClientRect();
  return { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) };
}

export function localCanvasPointer(
  canvas: HTMLCanvasElement,
  event: Pick<PointerEvent | WheelEvent | MouseEvent, 'clientX' | 'clientY'>,
): { x: number; y: number } {
  const bounds = canvas.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}
