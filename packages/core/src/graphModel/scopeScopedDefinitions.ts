import type { IGraphNodeTypeDefinition } from '../graphControls/contracts';
import { CORE_GRAPH_NODE_TYPES } from '../graphControls/defaults/definitions';
import type { GraphModelScopeConfig } from './contracts';
import { getDisabledTypes } from './model';
import { getDefinitionSymbolKinds } from './scopeSymbolMatch';

export interface ScopedSymbolDefinition {
  definition: IGraphNodeTypeDefinition;
  enabled: boolean;
  specificity: number;
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

export function getScopedSymbolDefinitions(scope: GraphModelScopeConfig): ScopedSymbolDefinition[] {
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

export function getDisabledScopedSymbolDefinitions(scope: GraphModelScopeConfig): IGraphNodeTypeDefinition[] {
  const disabledNodeTypes = getDisabledTypes(scope.nodes);
  return scope.nodes
    .filter((item) => !item.enabled && !item.type.startsWith('symbol:'))
    .flatMap((item) => CORE_GRAPH_NODE_TYPES.filter((definition) => (
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
