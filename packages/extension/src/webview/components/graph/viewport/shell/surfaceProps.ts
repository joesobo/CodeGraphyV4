import type { UseGraphCallbacksResult } from '../../rendering/useGraphCallbacks';
import type { GraphRuntime } from '../../runtime/use/state';
import type { GraphViewStoreState } from '../../view/store';
import type { ViewportProps } from '../view';

export interface CreateGraphViewportSurfacePropsInput {
  callbacks: UseGraphCallbacksResult;
  graphState: GraphRuntime;
  onRenderFramePost: ViewportProps['surface2dProps']['onRenderFramePost'];
  sharedProps: ViewportProps['surface2dProps']['sharedProps'];
  viewState: Pick<GraphViewStoreState, 'particleSize' | 'particleSpeed' | 'physicsPaused' | 'physicsSettings'>;
}

export function createGraphViewportSurfaceProps({
  callbacks,
  graphState,
  onRenderFramePost,
  sharedProps,
  viewState,
}: CreateGraphViewportSurfacePropsInput): Pick<ViewportProps, 'surface2dProps'> {
  return {
    surface2dProps: {
      fg2dRef: graphState.renderer.fg2dRef,
      getArrowColor: callbacks.getArrowColor,
      getArrowRelPos: callbacks.getArrowRelPos,
      getLinkColor: callbacks.getLinkColor,
      getLinkParticles: callbacks.getLinkParticles,
      getLinkWidth: callbacks.getLinkWidth,
      getNodeStyle: callbacks.getNodeStyle,
      getParticleColor: callbacks.getParticleColor,
      linkCanvasObject: callbacks.linkCanvasObject,
      nodeCanvasObject: callbacks.nodeCanvasObject,
      nodeLabelCanvasObject: callbacks.nodeLabelCanvasObject,
      nodePointerAreaPaint: callbacks.nodePointerAreaPaint,
      onRenderFramePost,
      particleSize: viewState.particleSize,
      particleSpeed: viewState.particleSpeed,
      physicsPaused: viewState.physicsPaused,
      physicsSettings: viewState.physicsSettings,
      sharedProps,
    },
  };
}
