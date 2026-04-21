import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { IGraphControlsSnapshot } from '../../../../../shared/graphControls/contracts';
import { mergeEdgeTypes, mergeNodeTypes } from './merge';
import {
  resolveNodeColorEnabledMap,
  resolveNodeColors,
  resolveVisibilityMap,
} from './values';
import type {
  GraphControlsConfigurationLike,
  GraphEdgeTypeLike,
  GraphNodeTypeLike,
} from './contracts';

export function captureGraphControlsSnapshot(
  config: GraphControlsConfigurationLike,
  graphData: IGraphData,
  pluginNodeTypes: GraphNodeTypeLike[],
  pluginEdgeTypes: GraphEdgeTypeLike[],
): IGraphControlsSnapshot {
  const configuredNodeColors = config.get<Record<string, string>>('nodeColors', {}) ?? {};
  const configuredNodeColorEnabled = config.get<Record<string, boolean>>('nodeColorEnabled', {}) ?? {};
  const configuredNodeVisibility = config.get<Record<string, boolean>>('nodeVisibility', {}) ?? {};
  const configuredEdgeVisibility = config.get<Record<string, boolean>>('edgeVisibility', {}) ?? {};
  const nodeTypes = mergeNodeTypes(graphData, pluginNodeTypes, configuredNodeColors);
  const edgeTypes = mergeEdgeTypes(graphData, pluginEdgeTypes);

  return {
    nodeTypes,
    edgeTypes,
    nodeColors: resolveNodeColors(nodeTypes, configuredNodeColors),
    nodeColorEnabled: resolveNodeColorEnabledMap(nodeTypes, configuredNodeColorEnabled),
    nodeVisibility: resolveVisibilityMap(nodeTypes, configuredNodeVisibility),
    edgeVisibility: resolveVisibilityMap(edgeTypes, configuredEdgeVisibility),
  };
}
