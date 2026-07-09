import React from 'react';
import Graph from '../../components/graph/view/component';
import { DepthViewControls } from '../../components/depthViewControls';
import { EmptyState } from '../shell/states';
import { getNoDataHint } from '../shell/messages';
import type { IGraphData } from '../../../shared/graph/contracts';
import { useGraphPerfCommit } from '../../perf/graph/commit';

type GraphComponentProps = React.ComponentProps<typeof Graph>;

export interface GraphSurfaceProps {
  graphData: IGraphData;
  coloredData: IGraphData | null | undefined;
  projectionRevision?: object;
  showOrphans: boolean;
  depthMode: boolean;
  timelineActive: boolean;
  theme: GraphComponentProps['theme'];
  nodeDecorations: GraphComponentProps['nodeDecorations'];
  edgeDecorations: GraphComponentProps['edgeDecorations'];
  pluginHost: GraphComponentProps['pluginHost'];
  onAddFilterRequested: GraphComponentProps['onAddFilterRequested'];
  onAddLegendRequested: GraphComponentProps['onAddLegendRequested'];
}

export function GraphSurface({
  graphData,
  coloredData,
  projectionRevision,
  showOrphans,
  depthMode,
  timelineActive,
  theme,
  nodeDecorations,
  edgeDecorations,
  pluginHost,
  onAddFilterRequested,
  onAddLegendRequested,
}: GraphSurfaceProps): React.ReactElement {
  const graphIsEmpty = graphData.nodes.length === 0;
  useGraphPerfCommit({
    edgeCount: 0,
    enabled: graphIsEmpty,
    layoutKey: undefined,
    nodeCount: 0,
    projectionRevision,
    revision: graphData,
  });

  if (graphIsEmpty) {
    return (
      <EmptyState
        hint={getNoDataHint(graphData, showOrphans, depthMode, timelineActive)}
        fullScreen={false}
      />
    );
  }

  return (
    <>
      <Graph
        data={coloredData || graphData}
        projectionRevision={projectionRevision}
        theme={theme}
        nodeDecorations={nodeDecorations}
        edgeDecorations={edgeDecorations}
        onAddFilterRequested={onAddFilterRequested}
        onAddLegendRequested={onAddLegendRequested}
        pluginHost={pluginHost}
      />
      <DepthViewControls />
    </>
  );
}
