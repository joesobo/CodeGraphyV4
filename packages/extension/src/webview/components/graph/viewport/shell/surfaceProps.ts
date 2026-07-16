import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { UseGraphCallbacksResult } from '../../rendering/useGraphCallbacks';
import type { GraphRuntime } from '../../runtime/use/state';
import type { GraphViewStoreState } from '../../view/store';
import type { ViewportProps } from '../view';

export interface CreateGraphViewportSurfacePropsInput {
  callbacks: UseGraphCallbacksResult;
  graphState: GraphRuntime;
  graphViewContributions?: CoreGraphViewContributionSet;
  onRenderFramePost: ViewportProps['surface2dProps']['onRenderFramePost'];
  sharedProps: ViewportProps['surface2dProps']['sharedProps'];
  viewState: Pick<
    GraphViewStoreState,
    'particleSize' | 'particleSpeed' | 'physicsSettings' | 'showFps' | 'showMinimap'
  >;
}

export function createGraphViewportSurfaceProps({
  callbacks,
  graphState,
  graphViewContributions,
  onRenderFramePost,
  sharedProps,
  viewState,
}: CreateGraphViewportSurfacePropsInput): Pick<ViewportProps, 'surface2dProps'> {
  return {
    surface2dProps: {
      fg2dRef: graphState.renderer.fg2dRef,
      graphViewContributions,
      getArrowColor: callbacks.getArrowColor,
      getLinkColor: callbacks.getLinkColor,
      getLinkOpacity: callbacks.getLinkOpacity,
      getLinkParticles: callbacks.getLinkParticles,
      getLinkWidth: callbacks.getLinkWidth,
      getNodeStyle: callbacks.getNodeStyle,
      getParticleColor: callbacks.getParticleColor,
      getStyleRevision: callbacks.getStyleRevision,
      nodeLabelCanvasObject: callbacks.nodeLabelCanvasObject,
      onRenderFramePost,
      particleSize: viewState.particleSize,
      particleSpeed: viewState.particleSpeed,
      physicsSettings: viewState.physicsSettings,
      showFps: viewState.showFps,
      showMinimap: viewState.showMinimap,
      sharedProps,
    },
  };
}
