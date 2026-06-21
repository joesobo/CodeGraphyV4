import type { IGraphData } from '../../../../../shared/graph/contracts';
import type {
  IGraphEdgeTypeDefinition,
  IGraphNodeTypeDefinition,
} from '../../../../../shared/graphControls/contracts';
import {
  CORE_GRAPH_EDGE_TYPES,
  CORE_GRAPH_NODE_TYPES,
  STRUCTURAL_NESTS_EDGE_KIND,
} from '../../../../../shared/graphControls/defaults/definitions';
import {
  normalizeHexColor,
} from '../../../../../shared/fileColors';
import { isFileNode } from '../../../../../shared/visibleGraph/model';
import { prettifyIdentifier } from './identifiers';
import type {
  GraphEdgeTypeCapabilityLike,
  GraphNodeTypeCapabilityLike,
  GraphEdgeTypeLike,
  GraphNodeTypeLike,
} from './contracts';

const STRUCTURAL_NODE_TYPE_IDS = new Set(['file', 'folder', 'package']);
const CORE_GRAPH_EDGE_TYPE_IDS = new Set(CORE_GRAPH_EDGE_TYPES.map(edgeType => edgeType.id));

export function mergeNodeTypes(
  _graphData: IGraphData,
  pluginNodeTypes: GraphNodeTypeLike[],
  configuredNodeColors: Record<string, string>,
  nodeTypeCapabilities?: readonly GraphNodeTypeCapabilityLike[],
): IGraphNodeTypeDefinition[] {
  const availableNodeTypes = collectAvailableNodeTypes(nodeTypeCapabilities, pluginNodeTypes);
  const definitions = new Map<string, IGraphNodeTypeDefinition>();

  for (const definition of CORE_GRAPH_NODE_TYPES) {
    if (!availableNodeTypes.has(definition.id)) {
      continue;
    }

    definitions.set(
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
    );
  }

  for (const definition of pluginNodeTypes) {
    if (availableNodeTypes.has(definition.id)) {
      definitions.set(definition.id, definition);
    }
  }

  return Array.from(definitions.values());
}

function collectAvailableNodeTypes(
  nodeTypeCapabilities: readonly GraphNodeTypeCapabilityLike[] | undefined,
  pluginNodeTypes: readonly GraphNodeTypeLike[],
): Set<string> {
  const availableNodeTypes = new Set<string>(STRUCTURAL_NODE_TYPE_IDS);
  const definitions = [...CORE_GRAPH_NODE_TYPES, ...pluginNodeTypes];

  if (nodeTypeCapabilities) {
    for (const nodeType of nodeTypeCapabilities) {
      availableNodeTypes.add(nodeType);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;

    for (const definition of definitions) {
      if (!definition.parentId || !availableNodeTypes.has(definition.id) || availableNodeTypes.has(definition.parentId)) {
        continue;
      }

      availableNodeTypes.add(definition.parentId);
      changed = true;
    }
  }

  return availableNodeTypes;
}

export function mergeEdgeTypes(
  graphData: IGraphData,
  pluginEdgeTypes: GraphEdgeTypeLike[],
  edgeTypeCapabilities?: GraphEdgeTypeCapabilityLike[],
): IGraphEdgeTypeDefinition[] {
  const availableEdgeKinds = collectAvailableEdgeKinds(graphData, edgeTypeCapabilities);
  const capabilityEdgeKinds = collectCapabilityEdgeKinds(edgeTypeCapabilities);
  const definitions = new Map<string, IGraphEdgeTypeDefinition>();

  for (const definition of CORE_GRAPH_EDGE_TYPES) {
    if (availableEdgeKinds.has(definition.id)) {
      definitions.set(definition.id, {
        ...definition,
        ...(definition.id === 'overrides' && !capabilityEdgeKinds.has(definition.id)
          ? { requiresEdgeType: 'inherit' as const }
          : {}),
      });
    }
  }

  for (const definition of pluginEdgeTypes) {
    if (availableEdgeKinds.has(definition.id)) {
      definitions.set(definition.id, {
        id: definition.id as IGraphEdgeTypeDefinition['id'],
        label: definition.label,
        defaultColor: definition.defaultColor,
        defaultVisible: definition.defaultVisible,
        description: definition.description,
      });
    }
  }

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

  return Array.from(definitions.values());
}

function collectAvailableEdgeKinds(
  graphData: IGraphData,
  edgeTypeCapabilities: readonly GraphEdgeTypeCapabilityLike[] | undefined,
): Set<string> {
  const edgeKinds = collectCapabilityEdgeKinds(edgeTypeCapabilities);
  const hasCoreEdgeTypeCapabilities = edgeTypeCapabilities?.some(edgeType => CORE_GRAPH_EDGE_TYPE_IDS.has(edgeType)) ?? false;

  for (const edge of graphData.edges) {
    if (
      !edgeTypeCapabilities
      || edgeTypeCapabilities.length === 0
      || !hasCoreEdgeTypeCapabilities
      || edgeTypeCapabilities.includes(edge.kind)
      || !CORE_GRAPH_EDGE_TYPE_IDS.has(edge.kind)
    ) {
      edgeKinds.add(edge.kind);
    }
  }

  if (graphData.nodes.some(isFileNode)) {
    if (shouldAddLegacyReferenceEdgeKind(edgeKinds)) {
      edgeKinds.add('reference');
    }
    edgeKinds.add(STRUCTURAL_NESTS_EDGE_KIND);
  }

  return edgeKinds;
}

function collectCapabilityEdgeKinds(
  edgeTypeCapabilities: readonly GraphEdgeTypeCapabilityLike[] | undefined,
): Set<string> {
  const edgeKinds = new Set<string>();

  if (edgeTypeCapabilities) {
    for (const edgeType of edgeTypeCapabilities) {
      edgeKinds.add(edgeType);
    }
  }

  return edgeKinds;
}

function shouldAddLegacyReferenceEdgeKind(
  edgeKinds: ReadonlySet<string>,
): boolean {
  const hasExplicitNonReferenceShape = edgeKinds.has('overrides')
    || edgeKinds.has('type')
    || edgeKinds.has('type-import');
  if (hasExplicitNonReferenceShape) {
    return false;
  }

  return true;
}
