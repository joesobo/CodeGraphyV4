import { useMemo } from 'react';
import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';
import type { GraphViewStoreState } from '../view/store';
import type {
  GraphContextSelection,
  GraphContextMenuEntry,
} from '../contextMenu/contracts';
import { buildGraphContextMenuEntries } from '../contextMenu/build/entries';
import type { UseGraphInteractionRuntimeResult } from '../runtime/use/interaction';
import type { UseGraphRenderingRuntimeResult } from '../runtime/use/rendering';
import type { GraphRuntime } from '../runtime/use/state';
import { buildSharedGraphProps } from '../rendering/surface/sharedProps';
import { getGraphSurfaceColors } from '../rendering/surface/colors';
import type { GraphAppearance } from '../appearance/model';

export interface GraphViewportModel {
  canvasBackgroundColor: string;
  containerBackgroundColor: string;
  menuEntries: GraphContextMenuEntry[];
  sharedProps: ReturnType<typeof buildSharedGraphProps>;
}

export interface GraphViewportModelOptions {
  graphState: {
    contextSelection: GraphContextSelection;
    graphData: GraphRuntime['renderer']['graphData'];
  };
  graphViewContributions?: ExtensionGraphViewContributionSet;
  interactions: UseGraphInteractionRuntimeResult;
  handleEngineStop(this: void): void;
  appearance?: GraphAppearance;
  viewportRuntime: Pick<UseGraphRenderingRuntimeResult, 'containerSize'>;
  viewState: Pick<GraphViewStoreState, 'favorites' | 'pluginContextMenuItems'>;
}

export function useGraphViewportModel({
  graphState,
  graphViewContributions,
  interactions,
  handleEngineStop,
  appearance,
  viewportRuntime,
  viewState,
}: GraphViewportModelOptions): GraphViewportModel {
  const sharedProps = useMemo(
    () => buildSharedGraphProps({
      graphData: graphState.graphData,
      onBackgroundClick: interactions.interactionHandlers.handleBackgroundClick,
      onBackgroundRightClick: interactions.handleBackgroundRightClick,
      onEngineStop: handleEngineStop,
      onLinkClick: interactions.interactionHandlers.handleLinkClick,
      onLinkRightClick: interactions.handleLinkRightClick,
      onNodeClick: interactions.interactionHandlers.handleNodeClick,
      onNodeDrag: interactions.handleNodeDrag,
      onNodeDragEnd: interactions.handleNodeDragEnd,
      onNodeHover: interactions.handleNodeHover,
      onNodeRightClick: interactions.handleNodeRightClick,
      width: viewportRuntime.containerSize.width,
    }),
    [
      graphState.graphData,
      handleEngineStop,
      interactions,
      viewportRuntime.containerSize.width,
    ],
  );

  const menuEntries = buildGraphContextMenuEntries({
    selection: graphState.contextSelection,
    favorites: viewState.favorites,
    pluginItems: viewState.pluginContextMenuItems,
    graphViewContributions,
    nodes: graphState.graphData.nodes,
    edges: graphState.graphData.links,
  });

  const { canvasBackgroundColor, containerBackgroundColor } = getGraphSurfaceColors(appearance);

  return {
    canvasBackgroundColor,
    containerBackgroundColor,
    menuEntries,
    sharedProps,
  };
}
