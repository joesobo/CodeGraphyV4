import type { GraphLayoutInput, GraphLayoutState } from './contracts';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function finiteOrFallback(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? value as number : fallback;
}

function setInitialPosition(
  state: Pick<GraphLayoutState, 'x' | 'y'>,
  index: number,
  spacing: number,
): void {
  const radius = spacing * Math.sqrt(0.5 + index);
  const angle = index * GOLDEN_ANGLE;
  state.x[index] = Math.cos(angle) * radius;
  state.y[index] = Math.sin(angle) * radius;
}

export function initializeGraphLayoutNode(
  state: GraphLayoutState,
  input: GraphLayoutInput,
  index: number,
  spacing: number,
): void {
  const suppliedX = input.initialX?.[index];
  const suppliedY = input.initialY?.[index];
  if (Number.isFinite(suppliedX) && Number.isFinite(suppliedY)) {
    state.x[index] = suppliedX as number;
    state.y[index] = suppliedY as number;
  } else {
    setInitialPosition(state, index, spacing);
  }
  state.vx[index] = finiteOrFallback(input.initialVx?.[index], 0);
  state.vy[index] = finiteOrFallback(input.initialVy?.[index], 0);
  state.chargeStrengthMultipliers[index] = Math.max(
    0,
    finiteOrFallback(state.chargeStrengthMultipliers[index], 1),
  );
  const suppliedRadius = input.radii[index];
  state.radii[index] = Number.isFinite(suppliedRadius) && suppliedRadius > 0
    ? suppliedRadius
    : 1;
}
