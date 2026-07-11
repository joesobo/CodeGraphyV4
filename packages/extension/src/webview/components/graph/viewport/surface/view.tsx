import { memo, type ReactElement } from 'react';
import type { DirectionMode } from '../../../../../shared/settings/modes';
import {
  Surface2d,
  type Surface2dProps,
} from '../../rendering/surface/view/twoDimensional';
import { areViewportSurfacePropsEqual } from './equality';

export interface ViewportSurfaceProps {
  canvasBackgroundColor: string;
  directionMode: DirectionMode;
  surface2dProps: Omit<Surface2dProps, 'backgroundColor' | 'directionMode'>;
}

function ViewportSurface({
  canvasBackgroundColor,
  directionMode,
  surface2dProps,
}: ViewportSurfaceProps): ReactElement {
  return (
    <Surface2d
      {...surface2dProps}
      backgroundColor={canvasBackgroundColor}
      directionMode={directionMode}
    />
  );
}

export const MemoizedViewportSurface = memo(ViewportSurface, areViewportSurfacePropsEqual);
