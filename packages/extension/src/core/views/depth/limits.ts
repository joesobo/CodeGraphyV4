export const MIN_DEPTH_LIMIT = 1;
export const MAX_DEPTH_LIMIT = 10;

export function clampDepthLimit(
  depthLimit: number | undefined,
  maxDepthLimit: number = MAX_DEPTH_LIMIT,
): number {
  if (depthLimit === undefined) {
    return MIN_DEPTH_LIMIT;
  }

  return Math.max(MIN_DEPTH_LIMIT, Math.min(maxDepthLimit, depthLimit));
}
