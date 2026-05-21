import type { FGNode } from '../../../model/build';

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function getPointerAreaRadius(node: FGNode): number | undefined {
  const area = node.pointerArea2D;
  if (!isFinitePositiveNumber(area?.height) || !isFinitePositiveNumber(area.width)) {
    return undefined;
  }

  return Math.hypot(area.height, area.width) / 2;
}

export function getGraphNodeValue(node: FGNode): number {
  const radius = getPointerAreaRadius(node) ?? (node.size ?? 16);
  return Math.max(1, radius * radius);
}
