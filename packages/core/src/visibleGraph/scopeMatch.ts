import type { IGraphData } from '../graph/contracts';
import type { IGraphNodeTypeDefinition } from '../graphControls/contracts';
import { CORE_GRAPH_NODE_TYPES } from '../graphControls/defaults/definitions';
import { getNodeType } from './model';
import { symbolMatchesScopedDefinition } from './scopeSymbolMatch';

function hasDisabledAncestor(
  definition: Pick<IGraphNodeTypeDefinition, 'parentId'> | undefined,
  disabledNodeTypes: ReadonlySet<string>,
  nodeTypeById: ReadonlyMap<string, IGraphNodeTypeDefinition>,
): boolean {
  let current = definition;
  while (current?.parentId) {
    if (disabledNodeTypes.has(current.parentId)) {
      return true;
    }
    current = nodeTypeById.get(current.parentId);
  }

  return false;
}

function hasDisabledDefinitionOrAncestor(
  definition: IGraphNodeTypeDefinition | undefined,
  disabledNodeTypes: ReadonlySet<string>,
  nodeTypeById: ReadonlyMap<string, IGraphNodeTypeDefinition>,
): boolean {
  let current = definition;
  while (current) {
    if (disabledNodeTypes.has(current.id)) {
      return true;
    }
    current = current.parentId ? nodeTypeById.get(current.parentId) : undefined;
  }

  return false;
}

function nodeTypeHasDisabledAncestor(
  nodeType: string,
  disabledNodeTypes: ReadonlySet<string>,
  nodeTypeById: ReadonlyMap<string, IGraphNodeTypeDefinition>,
): boolean {
  return hasDisabledAncestor(nodeTypeById.get(nodeType), disabledNodeTypes, nodeTypeById);
}

function getDefinitionSymbolKinds(definition: IGraphNodeTypeDefinition): readonly string[] | undefined {
  if (definition.matchSymbolKinds) {
    return definition.matchSymbolKinds;
  }

  if (definition.id.startsWith('symbol:')) {
    return [definition.id.slice('symbol:'.length)];
  }

  return undefined;
}

function getDefinitionSpecificity(definition: IGraphNodeTypeDefinition): number {
  const symbolKinds = getDefinitionSymbolKinds(definition);
  const symbolKindSpecificity = symbolKinds ? 1 / symbolKinds.length : 0;

  return [
    definition.matchSymbolPluginKind,
    definition.matchSymbolSource,
    definition.matchSymbolLanguage,
    definition.matchSymbolFilePath,
  ].filter(Boolean).length + symbolKindSpecificity;
}

export function symbolDefinitionHasMatcher(definition: IGraphNodeTypeDefinition): boolean {
  return getDefinitionSpecificity(definition) > 0;
}

function findMatchingSymbolDefinition(
  node: IGraphData['nodes'][number],
  nodeTypes: readonly IGraphNodeTypeDefinition[],
): IGraphNodeTypeDefinition | undefined {
  return nodeTypes
    .filter((definition) =>
      definition.parentId
      && symbolDefinitionHasMatcher(definition)
      && symbolMatchesScopedDefinition(node, definition)
    )
    .sort((left, right) => getDefinitionSpecificity(right) - getDefinitionSpecificity(left))[0];
}

export function nodeMatchesScope(
  node: IGraphData['nodes'][number],
  disabledNodeTypes: ReadonlySet<string>,
  disabledSymbolKinds: ReadonlySet<string>,
  disabledScopedSymbolDefinitions: readonly IGraphNodeTypeDefinition[],
  nodeTypes: readonly IGraphNodeTypeDefinition[] = CORE_GRAPH_NODE_TYPES,
): boolean {
  const nodeTypeById = new Map(nodeTypes.map((definition) => [definition.id, definition]));
  const nodeType = getNodeType(node);
  if (
    disabledNodeTypes.has(nodeType)
    || nodeTypeHasDisabledAncestor(nodeType, disabledNodeTypes, nodeTypeById)
  ) {
    return false;
  }

  const symbolKind = node.symbol?.kind;
  const matchingSymbolDefinition = findMatchingSymbolDefinition(node, nodeTypes);
  return (!symbolKind || !disabledSymbolKinds.has(symbolKind))
    && !hasDisabledDefinitionOrAncestor(
      matchingSymbolDefinition,
      disabledNodeTypes,
      nodeTypeById,
    )
    && (!symbolKind || Boolean(matchingSymbolDefinition))
    && disabledScopedSymbolDefinitions.every((definition) => !symbolMatchesScopedDefinition(node, definition));
}
