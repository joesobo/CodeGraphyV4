import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { IGraphNodeTypeDefinition } from '../../../../../shared/graphControls/contracts';
import { CORE_GRAPH_NODE_TYPES } from '../../../../../shared/graphControls/defaults/definitions';
import { normalizeHexColor } from '../../../../../shared/fileColors';
import type { GraphNodeTypeCapabilityLike, GraphNodeTypeLike } from './contracts';

const STRUCTURAL_NODE_TYPE_IDS = new Set(['file', 'folder', 'package']);

export function mergeNodeTypes(
  _graphData: IGraphData,
  pluginNodeTypes: GraphNodeTypeLike[],
  configuredNodeColors: Record<string, string>,
  nodeTypeCapabilities?: readonly GraphNodeTypeCapabilityLike[],
): IGraphNodeTypeDefinition[] {
  const availableNodeTypes = collectAvailableNodeTypes(nodeTypeCapabilities, pluginNodeTypes);
  const definitions = new Map<string, IGraphNodeTypeDefinition>();

  for (const definition of CORE_GRAPH_NODE_TYPES) {
    if (availableNodeTypes.has(definition.id)) {
      definitions.set(definition.id, applyConfiguredColor(definition, configuredNodeColors));
    }
  }

  for (const definition of pluginNodeTypes) {
    if (availableNodeTypes.has(definition.id)) {
      definitions.set(definition.id, {
        ...definition,
        id: definition.id as IGraphNodeTypeDefinition['id'],
        defaultColor: configuredNodeColors[definition.id] ?? '#94A3B8',
      });
    }
  }

  return Array.from(definitions.values());
}

function applyConfiguredColor(
  definition: IGraphNodeTypeDefinition,
  configuredNodeColors: Record<string, string>,
): IGraphNodeTypeDefinition {
  if (definition.id !== 'folder') {
    return definition;
  }

  return {
    ...definition,
    defaultColor: normalizeHexColor(configuredNodeColors.folder, definition.defaultColor),
  };
}

function collectAvailableNodeTypes(
  nodeTypeCapabilities: readonly GraphNodeTypeCapabilityLike[] | undefined,
  pluginNodeTypes: readonly GraphNodeTypeLike[],
): Set<string> {
  const availableNodeTypes = new Set<string>(STRUCTURAL_NODE_TYPE_IDS);
  for (const nodeType of nodeTypeCapabilities ?? []) {
    availableNodeTypes.add(nodeType);
  }

  addAvailableParentTypes(availableNodeTypes, [...CORE_GRAPH_NODE_TYPES, ...pluginNodeTypes]);
  return availableNodeTypes;
}

function addAvailableParentTypes(
  availableNodeTypes: Set<string>,
  definitions: readonly GraphNodeTypeLike[],
): void {
  let changed = true;
  while (changed) {
    changed = addParentTypesPass(availableNodeTypes, definitions);
  }
}

function addParentTypesPass(
  availableNodeTypes: Set<string>,
  definitions: readonly GraphNodeTypeLike[],
): boolean {
  let changed = false;
  for (const definition of definitions) {
    if (shouldAddParentType(definition, availableNodeTypes)) {
      availableNodeTypes.add(definition.parentId as string);
      changed = true;
    }
  }
  return changed;
}

function shouldAddParentType(
  definition: GraphNodeTypeLike,
  availableNodeTypes: ReadonlySet<string>,
): boolean {
  return Boolean(
    definition.parentId
    && availableNodeTypes.has(definition.id)
    && !availableNodeTypes.has(definition.parentId),
  );
}
