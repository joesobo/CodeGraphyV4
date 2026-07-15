const MINIMUM_SIZE_CHARGE_MULTIPLIER = 0.5;
const MAXIMUM_SIZE_CHARGE_MULTIPLIER = 4;

export function graphNodeSizeChargeMultiplier(
  size: number | undefined,
  defaultSize: number,
): number {
  const safeDefaultSize = Number.isFinite(defaultSize) && defaultSize > 0
    ? defaultSize
    : 1;
  const safeSize = Number.isFinite(size) ? Math.max(0, size as number) : safeDefaultSize;
  return Math.min(
    MAXIMUM_SIZE_CHARGE_MULTIPLIER,
    Math.max(MINIMUM_SIZE_CHARGE_MULTIPLIER, safeSize / safeDefaultSize),
  );
}
