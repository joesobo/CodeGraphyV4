import type { IGraphNodeTypeDefinition } from '../graphControls/contracts';
import { CORE_GRAPH_NODE_TYPES } from '../graphControls/defaults/definitions';
import type { VisibleGraphScopeConfig } from './contracts';
import { getDisabledTypes } from './model';

export function getDisabledScopedSymbolDefinitions(
  scope: VisibleGraphScopeConfig,
  nodeTypes: readonly IGraphNodeTypeDefinition[] = [
    ...new Map(
      [...CORE_GRAPH_NODE_TYPES, ...(scope.nodeTypes ?? [])]
        .map(definition => [definition.id, definition]),
    ).values(),
  ],
): IGraphNodeTypeDefinition[] {
  const disabledNodeTypes = getDisabledTypes(scope.nodes);
  return scope.nodes
    .filter((item) => !item.enabled && !item.type.startsWith('symbol:'))
    .flatMap((item) => nodeTypes.filter((definition) => (
      definition.id === item.type
      || (definition.parentId === item.type && disabledNodeTypes.has(item.type))
    )))
    .filter((definition): definition is IGraphNodeTypeDefinition => Boolean(
      definition?.matchSymbolPluginKind
      || definition?.matchSymbolSource
      || definition?.matchSymbolLanguage
      || definition?.matchSymbolFilePath,
    ));
}
