import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { IGraphControlsSnapshot } from '../../../../../shared/graphControls/contracts';
import { mergeEdgeTypes, mergeNodeTypes } from './merge';
import {
  resolveNodeColorEnabledMap,
  resolveNodeColors,
  resolveVisibilityMap,
} from './values';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../../../../shared/graphControls/defaults/definitions';
import type {
  GraphControlsConfigurationLike,
  GraphEdgeTypeLike,
  GraphNodeTypeLike,
} from './contracts';

const LEGACY_STRUCTURAL_NESTS_EDGE_KIND = 'codegraphy:nests';

function normalizeConfiguredEdgeVisibility(
  configured: Record<string, boolean>,
): Record<string, boolean> {
  if (
    typeof configured[STRUCTURAL_NESTS_EDGE_KIND] === 'boolean'
    || typeof configured[LEGACY_STRUCTURAL_NESTS_EDGE_KIND] !== 'boolean'
  ) {
    return configured;
  }

  return {
    ...configured,
    [STRUCTURAL_NESTS_EDGE_KIND]: configured[LEGACY_STRUCTURAL_NESTS_EDGE_KIND],
  };
}

export function captureGraphControlsSnapshot(
  config: GraphControlsConfigurationLike,
  graphData: IGraphData,
  pluginNodeTypes: GraphNodeTypeLike[],
  pluginEdgeTypes: GraphEdgeTypeLike[],
): IGraphControlsSnapshot {
  const configuredNodeColors = config.get<Record<string, string>>('nodeColors', {}) ?? {};
  const configuredNodeColorEnabled = config.get<Record<string, boolean>>('nodeColorEnabled', {}) ?? {};
  const configuredNodeVisibility = config.get<Record<string, boolean>>('nodeVisibility', {}) ?? {};
  const configuredEdgeVisibility = normalizeConfiguredEdgeVisibility(
    config.get<Record<string, boolean>>('edgeVisibility', {}) ?? {},
  );
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
