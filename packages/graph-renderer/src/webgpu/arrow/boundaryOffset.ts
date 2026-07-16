export function nextBoundaryOffset(
  newton: number,
  radialDerivative: number,
  inside: number,
  outside: number,
): number {
  if (radialDerivative <= 0.000001) return (inside + outside) / 2;
  if (!Number.isFinite(newton)) return (inside + outside) / 2;
  if (newton <= inside || newton >= outside) return (inside + outside) / 2;
  return newton;
}
