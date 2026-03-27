import { relative, sep } from 'path';
import type { OrganizeDepthVerdict } from './organizeTypes';

/**
 * Count the directory depth (path segments) between a directory and its root.
 *
 * @param directoryPath - The full path to the directory
 * @param targetRoot - The root directory to measure from
 * @returns The number of path segments. The root itself is depth 0.
 *
 * Example:
 * - directoryDepth("/root/src", "/root") → 1
 * - directoryDepth("/root/src/utils", "/root") → 2
 * - directoryDepth("/root", "/root") → 0
 */
export function directoryDepth(directoryPath: string, targetRoot: string): number {
  // Get the relative path from root to the directory
  const relativePath = relative(targetRoot, directoryPath);

  // If paths are the same, depth is 0
  if (!relativePath || relativePath === '.') {
    return 0;
  }

  // Count segments: split on path separators and filter empty strings
  const segments = relativePath.split(sep).filter((seg) => seg.length > 0);

  return segments.length;
}

/**
 * Determine the depth verdict based on thresholds.
 *
 * @param depth - The measured depth
 * @param warningThreshold - Depth at which a WARNING verdict is issued
 * @param deepThreshold - Depth at which a DEEP verdict is issued
 * @returns The verdict: 'STABLE' if depth < warning, 'WARNING' if depth >= warning && depth < deep, 'DEEP' if depth >= deep
 */
export function depthVerdict(
  depth: number,
  warningThreshold: number,
  deepThreshold: number
): OrganizeDepthVerdict {
  if (depth >= deepThreshold) {
    return 'DEEP';
  }
  if (depth >= warningThreshold) {
    return 'WARNING';
  }
  return 'STABLE';
}
