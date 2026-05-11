import type { IGraphData } from '../graph/contracts';
import type { IGraphNodeTypeDefinition } from '../graphControls/contracts';
import type { VisibleGraphScopeConfig, VisibleGraphScopeItem } from './contracts';
import { CORE_GRAPH_NODE_TYPES } from '../graphControls/defaults/definitions';
import { globMatch } from '../globMatch';
import { filterEdgesToNodes, getDisabledTypes, getNodeType } from './model';

function findScopeItem(
  items: readonly VisibleGraphScopeItem[],
  type: string,
): VisibleGraphScopeItem | undefined {
  return items.find((item) => item.type === type);
}

function getDisabledNodeTypes(scope: VisibleGraphScopeConfig): Set<string> {
  const disabledNodeTypes = getDisabledTypes(scope.nodes);
  if (findScopeItem(scope.nodes, 'symbol')?.enabled === false) {
    disabledNodeTypes.add('variable');
  }

  return disabledNodeTypes;
}

function getDisabledSymbolKinds(scope: VisibleGraphScopeConfig): Set<string> {
  return new Set(
    scope.nodes
      .filter((item) => item.type.startsWith('symbol:') && !item.enabled)
      .flatMap((item) => (
        CORE_GRAPH_NODE_TYPES.find((definition) => definition.id === item.type)?.matchSymbolKinds
        ?? [item.type.slice('symbol:'.length)]
      )),
  );
}

function getDisabledScopedSymbolDefinitions(scope: VisibleGraphScopeConfig) {
  return scope.nodes
    .filter((item) => !item.enabled && !item.type.startsWith('symbol:'))
    .map((item) => CORE_GRAPH_NODE_TYPES.find((definition) => definition.id === item.type))
    .filter((definition): definition is IGraphNodeTypeDefinition => Boolean(
      definition?.matchSymbolPluginKind
      || definition?.matchSymbolSource
      || definition?.matchSymbolLanguage
      || definition?.matchSymbolFilePath,
    ));
}

function symbolMatchesScopedDefinition(
  node: IGraphData['nodes'][number],
  definition: NonNullable<ReturnType<typeof getDisabledScopedSymbolDefinitions>[number]>,
): boolean {
  const symbol = node.symbol;
  if (!symbol) {
    return false;
  }

  const symbolKindMatches = !definition.matchSymbolKinds || definition.matchSymbolKinds.includes(symbol.kind);
  const pluginKindMatches = !definition.matchSymbolPluginKind || definition.matchSymbolPluginKind === symbol.pluginKind;
  const sourceMatches = !definition.matchSymbolSource || definition.matchSymbolSource === symbol.source;
  const languageMatches = !definition.matchSymbolLanguage || definition.matchSymbolLanguage === symbol.language;
  const filePathMatches = !definition.matchSymbolFilePath || globMatch(symbol.filePath, definition.matchSymbolFilePath);

  return symbolKindMatches && pluginKindMatches && sourceMatches && languageMatches && filePathMatches;
}

function nodeMatchesScope(
  node: IGraphData['nodes'][number],
  disabledNodeTypes: ReadonlySet<string>,
  disabledSymbolKinds: ReadonlySet<string>,
  disabledScopedSymbolDefinitions: ReturnType<typeof getDisabledScopedSymbolDefinitions>,
): boolean {
  if (disabledNodeTypes.has(getNodeType(node))) {
    return false;
  }

  const symbolKind = node.symbol?.kind;
  return (!symbolKind || !disabledSymbolKinds.has(symbolKind))
    && disabledScopedSymbolDefinitions.every((definition) => !symbolMatchesScopedDefinition(node, definition));
}

export function applyGraphScope(
  graphData: IGraphData,
  scope: VisibleGraphScopeConfig,
): IGraphData {
  const disabledNodeTypes = getDisabledNodeTypes(scope);
  const disabledSymbolKinds = getDisabledSymbolKinds(scope);
  const disabledScopedSymbolDefinitions = getDisabledScopedSymbolDefinitions(scope);
  const disabledEdgeTypes = getDisabledTypes(scope.edges);
  const nodes = graphData.nodes.filter((node) => nodeMatchesScope(
    node,
    disabledNodeTypes,
    disabledSymbolKinds,
    disabledScopedSymbolDefinitions,
  ));
  const scopedEdges = graphData.edges.filter((edge) => !disabledEdgeTypes.has(edge.kind));

  return {
    nodes,
    edges: filterEdgesToNodes(scopedEdges, nodes),
  };
}
