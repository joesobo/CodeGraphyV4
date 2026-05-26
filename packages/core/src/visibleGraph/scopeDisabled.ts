import type { VisibleGraphScopeConfig, VisibleGraphScopeItem } from './contracts';
import { getDisabledTypes } from './model';
export {
  getDisabledScopedSymbolDefinitions,
  getDisabledSymbolKinds,
} from './scopeSymbolTypes';

function findScopeItem(
  items: readonly VisibleGraphScopeItem[],
  type: string,
): VisibleGraphScopeItem | undefined {
  return items.find((item) => item.type === type);
}

export function getDisabledNodeTypes(scope: VisibleGraphScopeConfig): Set<string> {
  const disabledNodeTypes = getDisabledTypes(scope.nodes);
  if (findScopeItem(scope.nodes, 'symbol')?.enabled === false) {
    disabledNodeTypes.add('variable');
  }

  return disabledNodeTypes;
}
