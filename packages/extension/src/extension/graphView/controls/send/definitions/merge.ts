import type { IGraphData } from '../../../../../shared/graph/types';
import type {
  IGraphEdgeTypeDefinition,
  IGraphNodeTypeDefinition,
} from '../../../../../shared/graphControls/types';
import {
  CORE_GRAPH_EDGE_TYPES,
  CORE_GRAPH_NODE_TYPES,
} from '../../../../../shared/graphControls/defaults/definitions';
import {
  DEFAULT_FOLDER_NODE_COLOR,
  normalizeHexColor,
} from '../../../../../shared/fileColors';
import { prettifyIdentifier } from './identifiers';
import type { GraphEdgeTypeLike, GraphNodeTypeLike } from './contracts';

export function mergeNodeTypes(
  graphData: IGraphData,
  pluginNodeTypes: GraphNodeTypeLike[],
  configuredNodeColors: Record<string, string>,
): IGraphNodeTypeDefinition[] {
  const definitions = new Map<string, IGraphNodeTypeDefinition>(
    CORE_GRAPH_NODE_TYPES.map((definition) => [
      definition.id,
      definition.id === 'folder'
        ? {
            ...definition,
            defaultColor: normalizeHexColor(
              configuredNodeColors.folder,
              definition.defaultColor,
            ),
          }
        : definition,
    ]),
  );

  for (const definition of pluginNodeTypes) {
    definitions.set(definition.id, definition);
  }

  for (const node of graphData.nodes) {
    const nodeType = node.nodeType ?? 'file';
    if (!definitions.has(nodeType)) {
      definitions.set(nodeType, {
        id: nodeType,
        label: prettifyIdentifier(nodeType),
        defaultColor: node.color || DEFAULT_FOLDER_NODE_COLOR,
        defaultVisible: true,
      });
    }
  }

  return Array.from(definitions.values());
}

export function mergeEdgeTypes(
  graphData: IGraphData,
  pluginEdgeTypes: GraphEdgeTypeLike[],
): IGraphEdgeTypeDefinition[] {
  const definitions = new Map<string, IGraphEdgeTypeDefinition>(
    CORE_GRAPH_EDGE_TYPES.map((definition) => [definition.id, definition]),
  );

  for (const definition of pluginEdgeTypes) {
    definitions.set(definition.id, {
      id: definition.id as IGraphEdgeTypeDefinition['id'],
      label: definition.label,
      defaultColor: definition.defaultColor,
      defaultVisible: definition.defaultVisible,
    });
  }

  for (const edge of graphData.edges) {
    if (!definitions.has(edge.kind)) {
      definitions.set(edge.kind, {
        id: edge.kind,
        label: prettifyIdentifier(edge.kind),
        defaultColor: edge.color ?? '#94A3B8',
        defaultVisible: true,
      });
    }
  }

  return Array.from(definitions.values());
}
