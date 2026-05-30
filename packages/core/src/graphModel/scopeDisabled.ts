import type { GraphModelScopeConfig, GraphModelScopeItem } from './contracts';
import { getDisabledTypes } from './model';
export {
  getDisabledScopedSymbolDefinitions,
  getDisabledSymbolKinds,
} from './scopeSymbolTypes';

function findScopeItem(
  items: readonly GraphModelScopeItem[],
  type: string,
): GraphModelScopeItem | undefined {
  return items.find((item) => item.type === type);
}

export function getDisabledNodeTypes(scope: GraphModelScopeConfig): Set<string> {
  const disabledNodeTypes = getDisabledTypes(scope.nodes);
  if (findScopeItem(scope.nodes, 'symbol')?.enabled === false) {
    disabledNodeTypes.add('variable');
  }

  return disabledNodeTypes;
}
