import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { ThemeKind } from '../../../../theme/useTheme';
import type { WebviewPluginHost } from '../../../../pluginHost/manager';
import type { GraphAppearance } from '../../appearance/model';
import type { UseGraphCallbacksResult } from '../../rendering/useGraphCallbacks';
import type {
	UseGraphRenderingRuntimeOptions,
} from '../../runtime/use/rendering';
import type { GraphRuntime } from '../../runtime/use/state';
import type { GraphViewStoreState } from '../../view/store';

export interface BuildRenderingRuntimeOptionsInput {
	appearance?: GraphAppearance;
	callbacks: UseGraphCallbacksResult;
	graphDataLayoutKey: string;
	graphState: GraphRuntime;
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
		containerRef: graphState.renderer.containerRef,
		dataRef: graphState.dataRef,
		fg2dRef: graphState.renderer.fg2dRef,
		fg3dRef: graphState.renderer.fg3dRef,
		getArrowColor: callbacks.getArrowColor,
		getArrowRelPos: callbacks.getArrowRelPos,
		getLinkParticles: callbacks.getLinkParticles,
		getParticleColor: callbacks.getParticleColor,
		graphDataRef: graphState.renderer.graphDataRef,
		graphViewContributions,
		graphDataLayoutKey,
		graphResetVersion: graphState.renderer.resetVersion,
		graphStructureVersion: graphState.renderer.structureVersion,
		graphMode: viewState.graphMode,
		highlightVersion: graphState.highlightVersion,
		highlightedNeighborsRef: graphState.highlightedNeighborsRef,
		highlightedNodeRef: graphState.highlightedNodeRef,
		meshesRef: graphState.renderCaches.meshesRef,
		nodeSizeMode: viewState.nodeSizeMode,
		particleSize: viewState.particleSize,
		particleSpeed: viewState.particleSpeed,
		physicsPaused: viewState.physicsPaused,
		physicsSettings: viewState.physicsSettings,
		pluginHost,
		selectedNodesSetRef: graphState.selection.selectedNodeIdsRef,
		showLabels: viewState.showLabels,
		spritesRef: graphState.renderCaches.spritesRef,
		theme,
		timelineActive: viewState.timelineActive,
		favorites: viewState.favorites,
		directionMode: viewState.directionMode,
	};
}
