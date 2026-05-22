import type { IGraphData } from '../graph/contracts';
import type { IGraphNodeTypeDefinition } from '../graphControls/contracts';
import type { VisibleGraphScopeConfig } from './contracts';
import { CORE_GRAPH_NODE_TYPES } from '../graphControls/defaults/definitions';
import { globMatch } from '../globMatch';
import { filterEdgesToNodes, getDisabledTypes, getNodeType } from './model';

interface ScopedSymbolDefinition {
  definition: IGraphNodeTypeDefinition;
  enabled: boolean;
  specificity: number;
}

function getDisabledNodeTypes(scope: VisibleGraphScopeConfig): Set<string> {
  return getDisabledTypes(scope.nodes);
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
  return [
    getDefinitionSymbolKinds(definition),
    definition.matchSymbolPluginKind,
    definition.matchSymbolSource,
    definition.matchSymbolLanguage,
    definition.matchSymbolFilePath,
  ].filter(Boolean).length;
}

function getScopedSymbolDefinitions(scope: VisibleGraphScopeConfig): ScopedSymbolDefinition[] {
  const nodeVisibility = new Map(scope.nodes.map((item) => [item.type, item.enabled]));

  return CORE_GRAPH_NODE_TYPES
    .filter((definition) => definition.parentId && nodeVisibility.has(definition.id))
    .map((definition) => ({
      definition,
      enabled: nodeVisibility.get(definition.id) ?? definition.defaultVisible,
      specificity: getDefinitionSpecificity(definition),
    }))
    .sort((left, right) => right.specificity - left.specificity);
}

function symbolMatchesScopedDefinition(
  node: IGraphData['nodes'][number],
  definition: IGraphNodeTypeDefinition,
): boolean {
  const symbol = node.symbol;
  if (!symbol) {
    return false;
  }

  const definitionSymbolKinds = getDefinitionSymbolKinds(definition);
  const symbolKindMatches = !definitionSymbolKinds || definitionSymbolKinds.includes(symbol.kind);
  const pluginKindMatches = !definition.matchSymbolPluginKind || definition.matchSymbolPluginKind === symbol.pluginKind;
  const sourceMatches = !definition.matchSymbolSource || definition.matchSymbolSource === symbol.source;
  const languageMatches = !definition.matchSymbolLanguage || definition.matchSymbolLanguage === symbol.language;
  const filePathMatches = !definition.matchSymbolFilePath || globMatch(symbol.filePath, definition.matchSymbolFilePath);

  return symbolKindMatches && pluginKindMatches && sourceMatches && languageMatches && filePathMatches;
}

function getScopedSymbolVisibility(
  node: IGraphData['nodes'][number],
  scopedSymbolDefinitions: readonly ScopedSymbolDefinition[],
): boolean | undefined {
  const matchingDefinition = scopedSymbolDefinitions.find((item) => (
    symbolMatchesScopedDefinition(node, item.definition)
  ));

  return matchingDefinition?.enabled;
}

function nodeMatchesScope(
  node: IGraphData['nodes'][number],
  disabledNodeTypes: ReadonlySet<string>,
  scopedSymbolDefinitions: readonly ScopedSymbolDefinition[],
): boolean {
  const scopedSymbolVisibility = getScopedSymbolVisibility(node, scopedSymbolDefinitions);
  if (scopedSymbolVisibility !== undefined) {
    return scopedSymbolVisibility;
  }

  if (disabledNodeTypes.has(getNodeType(node))) {
    return false;
  }

  return true;
}

export function applyGraphScope(
  graphData: IGraphData,
  scope: VisibleGraphScopeConfig,
): IGraphData {
  const disabledNodeTypes = getDisabledNodeTypes(scope);
  const scopedSymbolDefinitions = getScopedSymbolDefinitions(scope);
  const disabledEdgeTypes = getDisabledTypes(scope.edges);
  const nodes = graphData.nodes.filter((node) => nodeMatchesScope(
    node,
    disabledNodeTypes,
    scopedSymbolDefinitions,
  ));
  const scopedEdges = graphData.edges.filter((edge) => !disabledEdgeTypes.has(edge.kind));

  return {
    nodes,
    edges: filterEdgesToNodes(scopedEdges, nodes),
  };
}
