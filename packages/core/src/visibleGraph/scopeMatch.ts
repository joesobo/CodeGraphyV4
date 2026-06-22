import type { IGraphData } from '../graph/contracts';
import type { IGraphNodeTypeDefinition } from '../graphControls/contracts';
import { CORE_GRAPH_NODE_TYPES } from '../graphControls/defaults/definitions';
import { getNodeType } from './model';
import { symbolMatchesScopedDefinition } from './scopeSymbolMatch';

const CORE_NODE_TYPE_BY_ID = new Map(CORE_GRAPH_NODE_TYPES.map((definition) => [definition.id, definition]));

function hasDisabledAncestor(
  definition: Pick<IGraphNodeTypeDefinition, 'parentId'> | undefined,
  disabledNodeTypes: ReadonlySet<string>,
): boolean {
  let current = definition;
  while (current?.parentId) {
    if (disabledNodeTypes.has(current.parentId)) {
      return true;
    }
    current = CORE_NODE_TYPE_BY_ID.get(current.parentId);
  }

  return false;
}

function hasDisabledDefinitionOrAncestor(
  definition: IGraphNodeTypeDefinition | undefined,
  disabledNodeTypes: ReadonlySet<string>,
): boolean {
  let current = definition;
  while (current) {
    if (disabledNodeTypes.has(current.id)) {
      return true;
    }
    current = current.parentId ? CORE_NODE_TYPE_BY_ID.get(current.parentId) : undefined;
  }

  return false;
}

function nodeTypeHasDisabledAncestor(
  nodeType: string,
  disabledNodeTypes: ReadonlySet<string>,
): boolean {
  return hasDisabledAncestor(CORE_NODE_TYPE_BY_ID.get(nodeType), disabledNodeTypes);
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

function hasSymbolMatcher(definition: IGraphNodeTypeDefinition): boolean {
  return getDefinitionSpecificity(definition) > 0;
}

function findMatchingSymbolDefinition(node: IGraphData['nodes'][number]): IGraphNodeTypeDefinition | undefined {
  return CORE_GRAPH_NODE_TYPES
    .filter((definition) =>
      definition.parentId && hasSymbolMatcher(definition) && symbolMatchesScopedDefinition(node, definition)
    )
    .sort((left, right) => getDefinitionSpecificity(right) - getDefinitionSpecificity(left))[0];
}

export function nodeMatchesScope(
  node: IGraphData['nodes'][number],
  disabledNodeTypes: ReadonlySet<string>,
  disabledSymbolKinds: ReadonlySet<string>,
  disabledScopedSymbolDefinitions: readonly IGraphNodeTypeDefinition[],
): boolean {
  const nodeType = getNodeType(node);
  if (disabledNodeTypes.has(nodeType) || nodeTypeHasDisabledAncestor(nodeType, disabledNodeTypes)) {
    return false;
  }

  const symbolKind = node.symbol?.kind;
  const matchingSymbolDefinition = findMatchingSymbolDefinition(node);
  return (!symbolKind || !disabledSymbolKinds.has(symbolKind))
    && !hasDisabledDefinitionOrAncestor(matchingSymbolDefinition, disabledNodeTypes)
    && (!symbolKind || Boolean(matchingSymbolDefinition))
    && disabledScopedSymbolDefinitions.every((definition) => !symbolMatchesScopedDefinition(node, definition));
}
