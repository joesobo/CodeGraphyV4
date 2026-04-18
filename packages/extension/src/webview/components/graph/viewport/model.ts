import { useMemo } from 'react';
import type { GraphViewStoreState } from '../store';
import type { GraphContextMenuEntry } from '../contextMenu/contracts';
import { buildGraphContextMenuEntries } from '../contextMenu/buildEntries';
import type { UseGraphInteractionRuntimeResult } from '../runtime/use/interaction';
import type { UseGraphRenderingRuntimeResult } from '../runtime/use/rendering';
import type { UseGraphStateResult } from '../runtime/use/state';
import { buildSharedGraphProps } from '../rendering/surface/sharedProps';
import { buildGraphSharedPropsOptions } from '../sharedPropsOptions';
import { handleGraphSurface3dError } from '../surfaceError';
import { getGraphSurfaceColors } from '../theme';
import type { ThemeKind } from '../../../theme/useTheme';
import { postMessage } from '../../../vscodeApi';

export interface GraphViewportModel {
  backgroundColor: string;
  borderColor: string;
  menuEntries: GraphContextMenuEntry[];
  onSurface3dError(this: void, error: Error): void;
  sharedProps: ReturnType<typeof buildSharedGraphProps>;
}

export interface GraphViewportModelOptions {
  graphState: Pick<UseGraphStateResult, 'contextSelection' | 'graphData'>;
  interactions: UseGraphInteractionRuntimeResult;
  handleEngineStop(this: void): void;
  theme: ThemeKind;
  viewportRuntime: Pick<UseGraphRenderingRuntimeResult, 'containerSize'>;
  viewState: Pick<
    GraphViewStoreState,
    'dagMode' | 'favorites' | 'physicsSettings' | 'pluginContextMenuItems' | 'setGraphMode' | 'timelineActive'
  >;
}

export function useGraphViewportModel({
  graphState,
  interactions,
  handleEngineStop,
  theme,
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
    favorites: viewState.favorites,
    pluginItems: viewState.pluginContextMenuItems,
  });

  const { backgroundColor, borderColor } = getGraphSurfaceColors(theme);
  const onSurface3dError = (error: Error): void => {
    handleGraphSurface3dError({
      error,
      postGraphMessage: postMessage,
      setGraphMode: viewState.setGraphMode,
    });
  };

  return {
    backgroundColor,
    borderColor,
    menuEntries,
    onSurface3dError,
    sharedProps,
  };
}
