import { CORE_GRAPH_NODE_TYPES } from '../graphControls/defaults/definitions';
import type { GraphModelScopeConfig } from './contracts';
export { getDisabledScopedSymbolDefinitions } from './scopeScopedDefinitions';

export function getDisabledSymbolKinds(scope: GraphModelScopeConfig): Set<string> {
  return new Set(
    scope.nodes
      .filter((item) => item.type.startsWith('symbol:') && !item.enabled)
      .flatMap((item) => (
        CORE_GRAPH_NODE_TYPES.find((definition) => definition.id === item.type)?.matchSymbolKinds
        ?? [item.type.slice('symbol:'.length)]
      )),
  );
}
