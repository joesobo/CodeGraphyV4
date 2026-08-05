import React from 'react';
import Graph from '../../components/graph/view/component';
import { DepthViewControls } from '../../components/depthViewControls';
import { EmptyState } from '../shell/states';
import { getNoDataHint } from '../shell/messages';
import type { IGraphData } from '../../../shared/graph/contracts';
import type { GraphStageEscapeBridge } from '../shell/escape/graphStage';

type GraphComponentProps = React.ComponentProps<typeof Graph>;

export interface GraphSurfaceProps {
  graphData: IGraphData;
  hasIndex: boolean;
  coloredData: IGraphData | null | undefined;
  showOrphans: boolean;
  depthMode: boolean;
  theme: GraphComponentProps['theme'];
  nodeDecorations: GraphComponentProps['nodeDecorations'];
  edgeDecorations: GraphComponentProps['edgeDecorations'];
  pluginHost: GraphComponentProps['pluginHost'];
  onAddFilterRequested: GraphComponentProps['onAddFilterRequested'];
  onAddLegendRequested: GraphComponentProps['onAddLegendRequested'];
  graphStageEscapeBridge?: GraphStageEscapeBridge;
}

export function GraphSurface({
  graphData,
  hasIndex,
  coloredData,
  showOrphans,
  depthMode,
  theme,
  nodeDecorations,
  edgeDecorations,
  pluginHost,
  onAddFilterRequested,
  onAddLegendRequested,
  graphStageEscapeBridge,
}: GraphSurfaceProps): React.ReactElement {
  if (graphData.nodes.length === 0) {
    return (
      <EmptyState
        hint={hasIndex
          ? getNoDataHint(graphData, showOrphans, depthMode)
          : 'Select Index Workspace to build this graph.'}
        fullScreen={false}
      />
    );
  }

  return (
    <>
      <Graph
        data={coloredData || graphData}
        theme={theme}
        nodeDecorations={nodeDecorations}
        edgeDecorations={edgeDecorations}
        onAddFilterRequested={onAddFilterRequested}
        onAddLegendRequested={onAddLegendRequested}
        graphStageEscapeBridge={graphStageEscapeBridge}
        pluginHost={pluginHost}
      />
      <DepthViewControls />
    </>
  );
}
