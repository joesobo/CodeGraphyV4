import { useMemo } from 'react';
import type { GraphViewStoreState } from '../view/store';
import type {
  GraphContextMenuEntry,
  GraphContextMutationAvailability,
} from '../contextMenu/contracts';
import { buildGraphContextMenuEntries } from '../contextMenu/build/entries';
import type { UseGraphInteractionRuntimeResult } from '../runtime/use/interaction';
import type { UseGraphRenderingRuntimeResult } from '../runtime/use/rendering';
import type { UseGraphStateResult } from '../runtime/use/state';
import { buildSharedGraphProps } from '../rendering/surface/sharedProps';
import { buildGraphSharedPropsOptions } from '../view/sharedPropsOptions';
import { handleGraphSurface3dError } from '../rendering/surface/error';
import { getGraphSurfaceColors } from '../rendering/surface/colors';
import type { ThemeKind } from '../../../theme/useTheme';
import type { GraphAppearance } from '../appearance/model';
import { postMessage } from '../../../vscodeApi';
import { getGraphLayoutPinCoordinate } from '../../../../shared/settings/graphLayout';

export interface GraphViewportModel {
  canvasBackgroundColor: string;
  containerBackgroundColor: string;
  borderColor: string;
  menuEntries: GraphContextMenuEntry[];
  onSurface3dError(this: void, error: Error): void;
  sharedProps: ReturnType<typeof buildSharedGraphProps>;
}

export interface GraphViewportModelOptions {
  graphState: Pick<UseGraphStateResult, 'contextSelection' | 'graphData'>;
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
    | 'graphLayout'
    | 'graphMode'
    | 'physicsSettings'
    | 'pluginContextMenuItems'
    | 'setGraphMode'
    | 'timelineActive'
    | 'timelineCommits'
  >;
}

function getActivePinnedNodeIds(
  viewState: Pick<GraphViewStoreState, 'graphLayout' | 'graphMode'>,
): Set<string> {
  const pinnedNodeIds = new Set<string>();

  for (const [nodeId, pinnedNode] of Object.entries(viewState.graphLayout.pinnedNodes)) {
    if (getGraphLayoutPinCoordinate(pinnedNode, viewState.graphMode)) {
      pinnedNodeIds.add(nodeId);
    }
  }

  return pinnedNodeIds;
}

export function getGraphContextMutationAvailability(
  viewState: Pick<GraphViewStoreState, 'currentCommitSha' | 'timelineActive' | 'timelineCommits'>,
): GraphContextMutationAvailability {
  if (!viewState.timelineActive) {
    return 'enabled';
  }

  const currentHeadSha = viewState.timelineCommits.at(-1)?.sha;
  return currentHeadSha && viewState.currentCommitSha === currentHeadSha
    ? 'enabled'
    : 'disabled';
}

export function useGraphViewportModel({
  graphState,
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
    pinnedNodeIds: getActivePinnedNodeIds(viewState),
    pluginItems: viewState.pluginContextMenuItems,
    nodes: graphState.graphData.nodes,
  });

  const { canvasBackgroundColor, containerBackgroundColor, borderColor } = getGraphSurfaceColors(appearance);
  const onSurface3dError = (error: Error): void => {
    handleGraphSurface3dError({
      error,
      postGraphMessage: postMessage,
      setGraphMode: viewState.setGraphMode,
    });
  };

  return {
    canvasBackgroundColor,
    containerBackgroundColor,
    borderColor,
    menuEntries,
    onSurface3dError,
    sharedProps,
  };
}
