import type { UseGraphCallbacksResult } from '../../rendering/useGraphCallbacks';
import type { UseGraphStateResult } from '../../runtime/use/state';
import type { GraphViewStoreState } from '../../view/store';
import type { ViewportProps } from '../view';

export interface CreateGraphViewportSurfacePropsInput {
	callbacks: UseGraphCallbacksResult;
	graphState: UseGraphStateResult;
	onRenderFramePost: ViewportProps['surface2dProps']['onRenderFramePost'];
	sharedProps: ViewportProps['surface2dProps']['sharedProps'];
	viewState: Pick<GraphViewStoreState, 'particleSize' | 'particleSpeed'>;
}

export function createGraphViewportSurfaceProps({
	callbacks,
	graphState,
	onRenderFramePost,
	sharedProps,
	viewState,
}: CreateGraphViewportSurfacePropsInput): Pick<ViewportProps, 'surface2dProps' | 'surface3dProps'> {
	return {
		surface2dProps: {
			fg2dRef: graphState.fg2dRef,
			getArrowColor: callbacks.getArrowColor,
			getArrowRelPos: callbacks.getArrowRelPos,
			getLinkColor: callbacks.getLinkColor,
			getLinkParticles: callbacks.getLinkParticles,
			getLinkWidth: callbacks.getLinkWidth,
			getParticleColor: callbacks.getParticleColor,
			linkCanvasObject: callbacks.linkCanvasObject,
			nodeCanvasObject: callbacks.nodeCanvasObject,
			nodePointerAreaPaint: callbacks.nodePointerAreaPaint,
			onRenderFramePost,
			particleSize: viewState.particleSize,
			particleSpeed: viewState.particleSpeed,
			sharedProps,
		},
		surface3dProps: {
			fg3dRef: graphState.fg3dRef,
			getArrowColor: callbacks.getArrowColor,
			getLinkColor: callbacks.getLinkColor,
			getLinkParticles: callbacks.getLinkParticles,
			getLinkWidth: callbacks.getLinkWidth,
			getParticleColor: callbacks.getParticleColor,
			nodeThreeObject: callbacks.nodeThreeObject,
			particleSize: viewState.particleSize,
			particleSpeed: viewState.particleSpeed,
			sharedProps,
		},
	};
}
