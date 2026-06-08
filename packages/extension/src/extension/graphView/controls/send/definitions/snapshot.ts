import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { IGraphControlsSnapshot } from '../../../../../shared/graphControls/contracts';
import { mergeEdgeTypes, mergeNodeTypes } from './merge';
import {
  resolveNodeColors,
  resolveVisibilityMap,
} from './values';
import type {
  GraphControlsConfigurationLike,
  GraphEdgeTypeLike,
  GraphNodeTypeLike,
  GraphScopeCapabilitiesLike,
} from './contracts';

export function captureGraphControlsSnapshot(
  config: GraphControlsConfigurationLike,
  graphData: IGraphData,
  pluginNodeTypes: GraphNodeTypeLike[],
  pluginEdgeTypes: GraphEdgeTypeLike[],
  graphScopeCapabilities: GraphScopeCapabilitiesLike = { nodeTypes: [], edgeTypes: [] },
): IGraphControlsSnapshot {
  const configuredNodeColors = config.get<Record<string, string>>('nodeColors', {}) ?? {};
  const configuredNodeVisibility = config.get<Record<string, boolean>>('nodeVisibility', {}) ?? {};
  const configuredEdgeVisibility = config.get<Record<string, boolean>>('edgeVisibility', {}) ?? {};
  const nodeTypes = mergeNodeTypes(
    graphData,
    pluginNodeTypes,
    configuredNodeColors,
    graphScopeCapabilities.nodeTypes,
  );
  const edgeTypes = mergeEdgeTypes(graphData, pluginEdgeTypes, graphScopeCapabilities.edgeTypes);

  return {
    nodeTypes,
    edgeTypes,
    nodeColors: resolveNodeColors(nodeTypes, configuredNodeColors),
    nodeVisibility: resolveVisibilityMap(nodeTypes, configuredNodeVisibility),
    edgeVisibility: resolveVisibilityMap(edgeTypes, configuredEdgeVisibility),
  };
}
