import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { IGraphControlsSnapshot } from '../../../../../shared/graphControls/contracts';
import type { IGroup } from '../../../../../shared/settings/groups';
import { mergeEdgeTypes, mergeNodeTypes } from './merge';
import {
  readLegendEdgeColorOverrides,
  resolveEdgeColors,
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
  const configuredNodeVisibility = config.get<Record<string, boolean>>('nodeVisibility', {}) ?? {};
  const configuredEdgeVisibility = config.get<Record<string, boolean>>('edgeVisibility', {}) ?? {};
  const configuredLegend = config.get<IGroup[]>('legend', []) ?? [];
  const nodeTypes = mergeNodeTypes(graphData, pluginNodeTypes, configuredNodeColors);
  const edgeTypes = mergeEdgeTypes(graphData, pluginEdgeTypes);

  return {
    nodeTypes,
    edgeTypes,
    nodeColors: resolveNodeColors(nodeTypes, configuredNodeColors),
    nodeVisibility: resolveVisibilityMap(nodeTypes, configuredNodeVisibility),
    edgeVisibility: resolveVisibilityMap(edgeTypes, configuredEdgeVisibility),
    edgeColors: resolveEdgeColors(edgeTypes, readLegendEdgeColorOverrides(configuredLegend)),
  };
}
