import type { ViewportSurfaceProps } from './view';

const SURFACE_2D_PROP_KEYS = [
  'fg2dRef',
  'getArrowColor',
  'getArrowRelPos',
  'getLinkColor',
  'getLinkParticles',
  'getLinkWidth',
  'getParticleColor',
  'linkCanvasObject',
  'nodeCanvasObject',
  'nodePointerAreaPaint',
  'onRenderFramePost',
  'particleSize',
  'particleSpeed',
  'physicsPaused',
  'physicsSettings',
  'sharedProps',
] as const;

const SURFACE_3D_PROP_KEYS = [
  'fg3dRef',
  'getArrowColor',
  'getLinkColor',
  'getLinkParticles',
  'getLinkWidth',
  'getParticleColor',
  'particleSize',
  'particleSpeed',
  'sharedProps',
] as const;

const NODE_THREE_OBJECT_CONTEXT_KEYS = [
  'graphAppearanceRef',
  'meshesRef',
  'showLabelsRef',
  'spritesRef',
] as const;

export function areViewportSurfacePropsEqual(
  previous: ViewportSurfaceProps,
  next: ViewportSurfaceProps,
): boolean {
  return previous.canvasBackgroundColor === next.canvasBackgroundColor
    && previous.directionMode === next.directionMode
    && previous.graphMode === next.graphMode
    && previous.onSurface3dError === next.onSurface3dError
    && propsEqualByKeys(previous.surface2dProps, next.surface2dProps, SURFACE_2D_PROP_KEYS)
    && propsEqualByKeys(previous.surface3dProps, next.surface3dProps, SURFACE_3D_PROP_KEYS)
    && propsEqualByKeys(
      previous.surface3dProps.nodeThreeObjectContext,
      next.surface3dProps.nodeThreeObjectContext,
      NODE_THREE_OBJECT_CONTEXT_KEYS,
    );
}

function propsEqualByKeys<T extends object, K extends keyof T>(
  previous: T,
  next: T,
  keys: readonly K[],
): boolean {
  return keys.every(key => previous[key] === next[key]);
}
