import {
  lazy,
  memo,
  Suspense,
  type ReactElement,
} from 'react';
import type { DirectionMode } from '../../../../../shared/settings/modes';
import {
  Surface2d,
  type Surface2dProps,
} from '../../rendering/surface/view/twoDimensional';
import type { Surface3dProps } from '../../rendering/surface/view/threeDimensional';
import { SurfaceFallbackBoundary } from '../../rendering/surface/view/fallbackBoundary';
import { areViewportSurfacePropsEqual } from './equality';

const LazyDeferredSurface3d = lazy(async () => {
  const module = await import('../../rendering/surface/view/threeDimensional');
  return { default: module.DeferredSurface3d };
});

export interface ViewportSurfaceProps {
  canvasBackgroundColor: string;
  directionMode: DirectionMode;
  graphMode: '2d' | '3d';
  onSurface3dError?: (error: Error) => void;
  surface2dProps: Omit<Surface2dProps, 'backgroundColor' | 'directionMode'>;
  surface3dProps: Omit<Surface3dProps, 'backgroundColor' | 'directionMode'>;
}

function ViewportSurface({
  canvasBackgroundColor,
  directionMode,
  graphMode,
  onSurface3dError,
  surface2dProps,
  surface3dProps,
}: ViewportSurfaceProps): ReactElement {
  if (graphMode === '2d') {
    return (
      <Surface2d
        {...surface2dProps}
        backgroundColor={canvasBackgroundColor}
        directionMode={directionMode}
      />
    );
  }

  const fallback = (
    <Surface2d
      {...surface2dProps}
      backgroundColor={canvasBackgroundColor}
      directionMode={directionMode}
    />
  );

  return (
    <SurfaceFallbackBoundary
      resetKey={graphMode}
      onError={onSurface3dError}
      fallback={fallback}
    >
      <Suspense fallback={fallback}>
        <LazyDeferredSurface3d
          {...surface3dProps}
          backgroundColor={canvasBackgroundColor}
          directionMode={directionMode}
          fallback={fallback}
        />
      </Suspense>
    </SurfaceFallbackBoundary>
  );
}

export const MemoizedViewportSurface = memo(ViewportSurface, areViewportSurfacePropsEqual);
