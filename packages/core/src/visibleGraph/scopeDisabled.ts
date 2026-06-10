import type { VisibleGraphScopeConfig } from './contracts';
import { getDisabledTypes } from './model';
export {
  getDisabledScopedSymbolDefinitions,
  getDisabledSymbolKinds,
} from './scopeSymbolTypes';

export function getDisabledNodeTypes(scope: VisibleGraphScopeConfig): Set<string> {
  return getDisabledTypes(scope.nodes);
}
