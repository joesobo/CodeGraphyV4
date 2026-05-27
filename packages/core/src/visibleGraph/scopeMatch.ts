import type { IGraphData } from '../graph/contracts';
import type { IGraphNodeTypeDefinition } from '../graphControls/contracts';
import { getNodeType } from './model';
import { symbolMatchesScopedDefinition } from './scopeSymbolMatch';

export function nodeMatchesScope(
  node: IGraphData['nodes'][number],
  disabledNodeTypes: ReadonlySet<string>,
  disabledSymbolKinds: ReadonlySet<string>,
  disabledScopedSymbolDefinitions: readonly IGraphNodeTypeDefinition[],
): boolean {
  if (disabledNodeTypes.has(getNodeType(node))) {
    return false;
  }

  const symbolKind = node.symbol?.kind;
  return (!symbolKind || !disabledSymbolKinds.has(symbolKind))
    && disabledScopedSymbolDefinitions.every((definition) => !symbolMatchesScopedDefinition(node, definition));
}
