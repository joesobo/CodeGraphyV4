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

function nodeTypeHasDisabledAncestor(
  nodeType: string,
  disabledNodeTypes: ReadonlySet<string>,
): boolean {
  return hasDisabledAncestor(CORE_NODE_TYPE_BY_ID.get(nodeType), disabledNodeTypes);
}

function hasSymbolMatcher(definition: IGraphNodeTypeDefinition): boolean {
  return Boolean(
    definition.matchSymbolKinds
    || definition.matchSymbolPluginKind
    || definition.matchSymbolSource
    || definition.matchSymbolLanguage
    || definition.matchSymbolFilePath
    || definition.id.startsWith('symbol:'),
  );
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
  const matchingSymbolDefinition = CORE_GRAPH_NODE_TYPES.find((definition) =>
    definition.parentId && hasSymbolMatcher(definition) && symbolMatchesScopedDefinition(node, definition)
  );
  return (!symbolKind || !disabledSymbolKinds.has(symbolKind))
    && !hasDisabledAncestor(matchingSymbolDefinition, disabledNodeTypes)
    && (!symbolKind || Boolean(matchingSymbolDefinition))
    && disabledScopedSymbolDefinitions.every((definition) => !symbolMatchesScopedDefinition(node, definition));
}
