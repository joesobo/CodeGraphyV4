import type { IGraphData } from '../graph/contracts';
import type { IGraphNodeTypeDefinition } from '../graphControls/contracts';
import { getNodeType } from './model';
import type { ScopedSymbolDefinition } from './scopeScopedDefinitions';
import { symbolMatchesScopedDefinition } from './scopeSymbolMatch';

function getScopedSymbolVisibility(
  node: IGraphData['nodes'][number],
  scopedSymbolDefinitions: readonly ScopedSymbolDefinition[],
): boolean | undefined {
  const matchingDefinition = scopedSymbolDefinitions.find((item) => (
    symbolMatchesScopedDefinition(node, item.definition)
  ));

  return matchingDefinition?.enabled;
}

export function nodeMatchesScope(
  node: IGraphData['nodes'][number],
  disabledNodeTypes: ReadonlySet<string>,
  disabledSymbolKinds: ReadonlySet<string>,
  disabledScopedSymbolDefinitions: readonly IGraphNodeTypeDefinition[],
  scopedSymbolDefinitions: readonly ScopedSymbolDefinition[] = [],
): boolean {
  const scopedSymbolVisibility = getScopedSymbolVisibility(node, scopedSymbolDefinitions);
  if (scopedSymbolVisibility !== undefined) {
    return scopedSymbolVisibility;
  }

  if (disabledNodeTypes.has(getNodeType(node))) {
    return false;
  }

  const symbolKind = node.symbol?.kind;
  return (!symbolKind || !disabledSymbolKinds.has(symbolKind))
    && disabledScopedSymbolDefinitions.every((definition) => !symbolMatchesScopedDefinition(node, definition));
}
