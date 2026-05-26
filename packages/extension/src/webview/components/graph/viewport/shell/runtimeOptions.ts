import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { ThemeKind } from '../../../../theme/useTheme';
import type { WebviewPluginHost } from '../../../../pluginHost/manager';
import type { GraphAppearance } from '../../appearance/model';
import type { UseGraphCallbacksResult } from '../../rendering/useGraphCallbacks';
import type {
	UseGraphRenderingRuntimeOptions,
} from '../../runtime/use/rendering';
import type { UseGraphStateResult } from '../../runtime/use/state';
import type { GraphViewStoreState } from '../../view/store';

export interface BuildRenderingRuntimeOptionsInput {
	appearance?: GraphAppearance;
	callbacks: UseGraphCallbacksResult;
	graphDataLayoutKey: string;
	graphState: UseGraphStateResult;
	graphViewContributions?: CoreGraphViewContributionSet;
	pluginHost?: WebviewPluginHost;
	theme: ThemeKind;
	viewState: GraphViewStoreState;
}

export function buildRenderingRuntimeOptions({
	appearance,
	callbacks,
	graphDataLayoutKey,
	graphState,
	graphViewContributions,
	pluginHost,
	theme,
	viewState,
}: BuildRenderingRuntimeOptionsInput): UseGraphRenderingRuntimeOptions {
	return {
		appearance,
		containerRef: graphState.containerRef,
		dataRef: graphState.dataRef,
		fg2dRef: graphState.fg2dRef,
		fg3dRef: graphState.fg3dRef,
		getArrowColor: callbacks.getArrowColor,
		getArrowRelPos: callbacks.getArrowRelPos,
		getLinkParticles: callbacks.getLinkParticles,
		getParticleColor: callbacks.getParticleColor,
		graphDataRef: graphState.graphDataRef,
		graphViewContributions,
		graphDataLayoutKey,
		graphMode: viewState.graphMode,
		highlightVersion: graphState.highlightVersion,
		highlightedNeighborsRef: graphState.highlightedNeighborsRef,
		highlightedNodeRef: graphState.highlightedNodeRef,
		meshesRef: graphState.meshesRef,
		nodeSizeMode: viewState.nodeSizeMode,
		particleSize: viewState.particleSize,
		particleSpeed: viewState.particleSpeed,
		physicsPaused: viewState.physicsPaused,
		physicsSettings: viewState.physicsSettings,
		pluginHost,
		selectedNodesSetRef: graphState.selectedNodesSetRef,
		showLabels: viewState.showLabels,
		spritesRef: graphState.spritesRef,
		theme,
		timelineActive: viewState.timelineActive,
		favorites: viewState.favorites,
		directionMode: viewState.directionMode,
	};
}
