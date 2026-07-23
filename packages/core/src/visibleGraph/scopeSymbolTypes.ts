import { CORE_GRAPH_NODE_TYPES } from '../graphControls/defaults/definitions';
import type { IGraphNodeTypeDefinition } from '../graphControls/contracts';
import type { VisibleGraphScopeConfig } from './contracts';
export { getDisabledScopedSymbolDefinitions } from './scopeScopedDefinitions';

interface SymbolKindScopeState {
  enabled: boolean;
  specificity: number;
}

export function getDisabledSymbolKinds(
  scope: VisibleGraphScopeConfig,
  nodeTypes: readonly IGraphNodeTypeDefinition[] = [
    ...new Map(
      [...CORE_GRAPH_NODE_TYPES, ...(scope.nodeTypes ?? [])]
        .map(definition => [definition.id, definition]),
    ).values(),
  ],
): Set<string> {
  const stateByKind = new Map<string, SymbolKindScopeState>();

  for (const item of scope.nodes.filter((scopeItem) => scopeItem.type.startsWith('symbol:'))) {
    const definition = nodeTypes.find((candidate) => candidate.id === item.type);
    const symbolKinds = getDefinitionSymbolKinds(definition, item.type);
    const specificity = getDefinitionSpecificity(definition, item.type);

    for (const symbolKind of symbolKinds) {
      const existing = stateByKind.get(symbolKind);
      if (existing && existing.specificity > specificity) {
        continue;
      }

      stateByKind.set(symbolKind, {
        enabled: item.enabled,
        specificity,
      });
    }
  }

  return new Set(
    Array.from(stateByKind.entries())
      .filter(([, state]) => !state.enabled)
      .map(([symbolKind]) => symbolKind),
  );
}

function getDefinitionSymbolKinds(
  definition: IGraphNodeTypeDefinition | undefined,
  type: string,
): readonly string[] {
  return definition?.matchSymbolKinds ?? [type.slice('symbol:'.length)];
}

function getDefinitionSpecificity(
  definition: IGraphNodeTypeDefinition | undefined,
  type: string,
): number {
  const symbolKinds = getDefinitionSymbolKinds(definition, type);
  return 1 / symbolKinds.length;
}
