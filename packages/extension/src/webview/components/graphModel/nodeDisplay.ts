import { DEFAULT_DIRECTION_COLOR } from '../../../shared/contracts';

export const FAVORITE_BORDER_COLOR = '#EAB308';
export const DEFAULT_NODE_SIZE = 16;

export function resolveDirectionColor(directionColor: string): string {
  return /^#[0-9A-F]{6}$/i.test(directionColor) ? directionColor : DEFAULT_DIRECTION_COLOR;
}

export function getDepthOpacity(depthLevel: number | undefined): number {
  if (depthLevel === undefined) return 1.0;
  if (depthLevel === 0) return 1.0;
  return Math.max(0.4, 1.0 - depthLevel * 0.15);
}

export function getDepthSizeMultiplier(depthLevel: number | undefined): number {
  if (depthLevel === undefined) return 1.0;
  if (depthLevel === 0) return 1.3;
  return 1.0;
}

export function getNodeType(filePath: string): string {
  const dotIndex = filePath.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === filePath.length - 1) {
    return '*';
  }

  return filePath.slice(dotIndex).toLowerCase();
}
