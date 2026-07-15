import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { IGraphEdgeTypeDefinition } from '../../../../../shared/graphControls/contracts';
import type { GraphEdgeTypeCapabilityLike, GraphEdgeTypeLike } from './contracts';
import { collectAvailableEdgeKinds, collectCapabilityEdgeKinds } from './edgeKindAvailability';
import { addCoreEdgeTypes, addInferredEdgeTypes, addPluginEdgeTypes } from './edgeTypeDefinitions';

export function mergeEdgeTypes(
  graphData: IGraphData,
  pluginEdgeTypes: GraphEdgeTypeLike[],
  edgeTypeCapabilities?: GraphEdgeTypeCapabilityLike[],
): IGraphEdgeTypeDefinition[] {
  const availableEdgeKinds = collectAvailableEdgeKinds(graphData, edgeTypeCapabilities);
  const capabilityEdgeKinds = collectCapabilityEdgeKinds(edgeTypeCapabilities);
  const definitions = new Map<string, IGraphEdgeTypeDefinition>();

  addCoreEdgeTypes(definitions, availableEdgeKinds, capabilityEdgeKinds);
  addPluginEdgeTypes(definitions, availableEdgeKinds, pluginEdgeTypes);
  addInferredEdgeTypes(definitions, availableEdgeKinds, graphData);
  return Array.from(definitions.values());
}
