import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { GraphAppearance } from '../../appearance/model';
import type { UseGraphInteractionRuntimeResult } from '../../runtime/use/interaction';
import type { UseGraphRenderingRuntimeResult } from '../../runtime/use/rendering';
import type { GraphRuntime } from '../../runtime/use/state';
import type { GraphViewStoreState } from '../../view/store';
import { useGraphViewportModel } from '../model';

export interface UseGraphViewportModelOptionsInput {
	appearance?: GraphAppearance;
	graphState: GraphRuntime;
	graphViewContributions?: CoreGraphViewContributionSet;
	interactions: UseGraphInteractionRuntimeResult;
	handleEngineStop(this: void): void;
	viewportRuntime: Pick<UseGraphRenderingRuntimeResult, 'containerSize' | 'renderPluginOverlays'>;
	viewState: GraphViewStoreState;
}

export function useGraphViewportModelOptions({
	appearance,
	graphState,
	graphViewContributions,
	interactions,
	handleEngineStop,
	viewportRuntime,
	viewState,
}: UseGraphViewportModelOptionsInput) {
	return useGraphViewportModel({
		graphState: {
			contextSelection: graphState.context.selection,
			graphData: graphState.renderer.graphData,
		},
		graphViewContributions,
		handleEngineStop,
		appearance,
		interactions,
		viewportRuntime,
		viewState,
	});
}
