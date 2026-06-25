import type { IGraphData } from '../../../graph/contracts';
import type { WorkspaceIndexRefreshSource } from '../contracts';

export function canCaptureWorkspaceIndexRefreshGraphSnapshot(
  source: WorkspaceIndexRefreshSource,
): boolean {
  return Boolean(source._patchGraphDataNodeMetrics)
    && !isWorkspaceIndexGraphDataEmpty(source._lastGraphData);
}

function isWorkspaceIndexGraphDataEmpty(graphData: IGraphData): boolean {
  return graphData.nodes.length === 0 && graphData.edges.length === 0;
}
