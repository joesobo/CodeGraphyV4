export interface LinkGridWalk { x: number; y: number; endX: number; endY: number; stepX: number; stepY: number; maximumX: number; maximumY: number; incrementX: number; incrementY: number }

function axisWalk(cell: number, start: number, delta: number, cellSize: number) {
  const step = Math.sign(delta);
  return {
    increment: step === 0 ? Infinity : cellSize / Math.abs(delta),
    maximum: step === 0 ? Infinity : ((cell + (step > 0 ? 1 : 0)) * cellSize - start) / delta,
    step,
  };
}

export function createLinkGridWalk(start: { x: number; y: number }, end: { x: number; y: number }, cellSize: number): LinkGridWalk {
  const x = Math.floor(start.x / cellSize); const y = Math.floor(start.y / cellSize);
  const horizontal = axisWalk(x, start.x, end.x - start.x, cellSize);
  const vertical = axisWalk(y, start.y, end.y - start.y, cellSize);
  return { x, y, endX: Math.floor(end.x / cellSize), endY: Math.floor(end.y / cellSize),
    stepX: horizontal.step, stepY: vertical.step, maximumX: horizontal.maximum,
    maximumY: vertical.maximum, incrementX: horizontal.increment, incrementY: vertical.increment };
}

export function advanceLinkGridWalk(walk: LinkGridWalk): void {
  const advanceX = walk.maximumX <= walk.maximumY;
  const advanceY = walk.maximumY <= walk.maximumX;
  if (advanceX) { walk.x += walk.stepX; walk.maximumX += walk.incrementX; }
  if (advanceY) { walk.y += walk.stepY; walk.maximumY += walk.incrementY; }
}
