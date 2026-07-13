import type { ViewportSurfaceProps } from './view';

const SURFACE_2D_PROP_KEYS = [
  'fg2dRef',
  'graphViewContributions',
  'getArrowColor',
  'getLinkColor',
  'getLinkParticles',
  'getLinkWidth',
  'getNodeStyle',
  'getParticleColor',
  'nodeLabelCanvasObject',
  'onRenderFramePost',
  'particleSize',
  'particleSpeed',
  'physicsSettings',
  'showFps',
  'sharedProps',
] as const;

export function areViewportSurfacePropsEqual(
  previous: ViewportSurfaceProps,
  next: ViewportSurfaceProps,
): boolean {
  return previous.canvasBackgroundColor === next.canvasBackgroundColor
    && previous.directionMode === next.directionMode
    && propsEqualByKeys(previous.surface2dProps, next.surface2dProps, SURFACE_2D_PROP_KEYS);
}

function propsEqualByKeys<T extends object, K extends keyof T>(
  previous: T,
  next: T,
  keys: readonly K[],
): boolean {
  return keys.every(key => previous[key] === next[key]);
}
