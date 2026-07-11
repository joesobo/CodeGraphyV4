import React from 'react';
import Graph from '../../components/graph/view/component';
import { DepthViewControls } from '../../components/depthViewControls';
import { EmptyState } from '../shell/states';
import { getNoDataHint } from '../shell/messages';
import type { IGraphData } from '../../../shared/graph/contracts';
import type { PerfScopeVisibilitySnapshot } from '../../../shared/perf/protocol';

type GraphComponentProps = React.ComponentProps<typeof Graph>;

export interface GraphSurfaceProps {
  graphData: IGraphData;
  coloredData: IGraphData | null | undefined;
  scopeProjectionRevision: number;
  scopeVisibility?: PerfScopeVisibilitySnapshot;
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
  scopeProjectionRevision,
  scopeVisibility,
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

  return (
    <>
      <Graph
        data={graphIsEmpty ? graphData : coloredData || graphData}
        scopeProjectionRevision={scopeProjectionRevision}
        scopeVisibility={scopeVisibility}
        theme={theme}
        nodeDecorations={nodeDecorations}
        edgeDecorations={edgeDecorations}
        onAddFilterRequested={onAddFilterRequested}
        onAddLegendRequested={onAddLegendRequested}
        pluginHost={pluginHost}
      />
      {graphIsEmpty
        ? (
            <div className="absolute inset-0 z-10">
              <EmptyState
                hint={getNoDataHint(graphData, showOrphans, depthMode, timelineActive)}
                fullScreen={false}
              />
            </div>
          )
        : <DepthViewControls />}
    </>
  );
}
