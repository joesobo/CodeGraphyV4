import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { IGraphEdgeTypeDefinition } from '../../../../../shared/graphControls/contracts';
import { CORE_GRAPH_EDGE_TYPES } from '../../../../../shared/graphControls/defaults/definitions';
import type { GraphEdgeTypeLike } from './contracts';
import { prettifyIdentifier } from './identifiers';

export function addCoreEdgeTypes(
  definitions: Map<string, IGraphEdgeTypeDefinition>,
  availableEdgeKinds: ReadonlySet<string>,
  capabilityEdgeKinds: ReadonlySet<string>,
): void {
  for (const definition of CORE_GRAPH_EDGE_TYPES) {
    if (!availableEdgeKinds.has(definition.id)) {
      continue;
    }

    definitions.set(definition.id, definition.id === 'overrides' && !capabilityEdgeKinds.has('overrides')
      ? { ...definition, requiresEdgeType: 'inherit' as const }
      : definition);
  }
}

export function addPluginEdgeTypes(
  definitions: Map<string, IGraphEdgeTypeDefinition>,
  availableEdgeKinds: ReadonlySet<string>,
  pluginEdgeTypes: readonly GraphEdgeTypeLike[],
): void {
  for (const definition of pluginEdgeTypes) {
    if (availableEdgeKinds.has(definition.id)) {
      definitions.set(definition.id, toEdgeTypeDefinition(definition));
    }
  }
}

function toEdgeTypeDefinition(definition: GraphEdgeTypeLike): IGraphEdgeTypeDefinition {
  return {
    id: definition.id as IGraphEdgeTypeDefinition['id'],
    label: definition.label,
    defaultColor: definition.defaultColor,
    defaultVisible: definition.defaultVisible,
    description: definition.description,
  };
}

export function addInferredEdgeTypes(
  definitions: Map<string, IGraphEdgeTypeDefinition>,
  availableEdgeKinds: ReadonlySet<string>,
  graphData: IGraphData,
): void {
  for (const edge of graphData.edges) {
    if (availableEdgeKinds.has(edge.kind) && !definitions.has(edge.kind)) {
      definitions.set(edge.kind, {
        id: edge.kind,
        label: prettifyIdentifier(edge.kind),
        defaultColor: edge.color ?? '#94A3B8',
        defaultVisible: true,
      });
    }
  }
}
