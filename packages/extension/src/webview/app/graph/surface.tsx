import React from 'react';
import Graph from '../../components/graph/view/component';
import { DepthViewControls } from '../../components/depthViewControls';
import { EmptyState } from '../shell/states';
import { getNoDataHint } from '../shell/messages';
import type { IGraphData } from '../../../shared/graph/contracts';

type GraphComponentProps = React.ComponentProps<typeof Graph>;

export interface GraphSurfaceProps {
  graphData: IGraphData;
  coloredData: IGraphData | null | undefined;
  showOrphans: boolean;
  depthMode: boolean;
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
  showOrphans,
  depthMode,
  theme,
  nodeDecorations,
  edgeDecorations,
  pluginHost,
  onAddFilterRequested,
  onAddLegendRequested,
}: GraphSurfaceProps): React.ReactElement {
  return (
    <>
      <Graph
        data={coloredData || graphData}
        theme={theme}
        nodeDecorations={nodeDecorations}
        edgeDecorations={edgeDecorations}
        onAddFilterRequested={onAddFilterRequested}
        onAddLegendRequested={onAddLegendRequested}
        pluginHost={pluginHost}
      />
      <DepthViewControls />
      {graphData.nodes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0">
          <EmptyState
            hint={getNoDataHint(graphData, showOrphans, depthMode)}
            fullScreen={false}
          />
        </div>
      ) : null}
    </>
  );
}
