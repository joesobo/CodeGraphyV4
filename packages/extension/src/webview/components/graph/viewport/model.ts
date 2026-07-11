import { useMemo } from 'react';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { GraphViewStoreState } from '../view/store';
import type {
  GraphContextSelection,
  GraphContextMenuEntry,
} from '../contextMenu/contracts';
import { buildGraphContextMenuEntries } from '../contextMenu/build/entries';
import { getGraphContextMutationAvailability } from '../contextMenu/mutationAvailability';
import type { UseGraphInteractionRuntimeResult } from '../runtime/use/interaction';
import type { UseGraphRenderingRuntimeResult } from '../runtime/use/rendering';
import type { GraphRuntime } from '../runtime/use/state';
import { buildSharedGraphProps } from '../rendering/surface/sharedProps';
import { buildGraphSharedPropsOptions } from '../view/sharedPropsOptions';
import { getGraphSurfaceColors } from '../rendering/surface/colors';
import type { ThemeKind } from '../../../theme/useTheme';
import type { GraphAppearance } from '../appearance/model';

export interface GraphViewportModel {
  canvasBackgroundColor: string;
  containerBackgroundColor: string;
  borderColor: string;
  menuEntries: GraphContextMenuEntry[];
  sharedProps: ReturnType<typeof buildSharedGraphProps>;
}

export interface GraphViewportModelOptions {
  graphState: {
    contextSelection: GraphContextSelection;
    graphData: GraphRuntime['renderer']['graphData'];
  };
  graphViewContributions?: CoreGraphViewContributionSet;
  interactions: UseGraphInteractionRuntimeResult;
  handleEngineStop(this: void): void;
  appearance?: GraphAppearance;
  theme?: ThemeKind;
  viewportRuntime: Pick<UseGraphRenderingRuntimeResult, 'containerSize'>;
  viewState: Pick<
    GraphViewStoreState,
    | 'currentCommitSha'
    | 'dagMode'
    | 'favorites'
    | 'physicsSettings'
    | 'pluginContextMenuItems'
    | 'timelineActive'
    | 'timelineCommits'
  >;
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
    () => buildSharedGraphProps(buildGraphSharedPropsOptions({
      containerSize: viewportRuntime.containerSize,
      dagMode: viewState.dagMode,
      damping: viewState.physicsSettings.damping,
      graphData: graphState.graphData,
      handleEngineStop,
      interactions,
      timelineActive: viewState.timelineActive,
    })),
    [
      graphState.graphData,
      handleEngineStop,
      interactions,
      viewportRuntime.containerSize,
      viewState.dagMode,
      viewState.physicsSettings.damping,
      viewState.timelineActive,
    ],
  );

  const menuEntries = buildGraphContextMenuEntries({
    selection: graphState.contextSelection,
    timelineActive: viewState.timelineActive,
    mutationAvailability: getGraphContextMutationAvailability(viewState),
    favorites: viewState.favorites,
    pluginItems: viewState.pluginContextMenuItems,
    graphViewContributions,
    nodes: graphState.graphData.nodes,
    edges: graphState.graphData.links,
  });

  const { canvasBackgroundColor, containerBackgroundColor, borderColor } = getGraphSurfaceColors(appearance);

  return {
    canvasBackgroundColor,
    containerBackgroundColor,
    borderColor,
    menuEntries,
    sharedProps,
  };
}
