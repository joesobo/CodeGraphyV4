import type { IGraphNodeTypeDefinition } from '../../contracts';
import { createSymbolAliasNodeTypes } from './symbols/aliases';
import { createSymbolCallableNodeTypes } from './symbols/callables';
import { createSymbolCompositionNodeTypes } from './symbols/composition';
import { createSymbolDataNodeTypes } from './symbols/data';
import { createSymbolEventNodeTypes } from './symbols/events';
import { createGodotAssetNodeTypes } from './symbols/godotAssets';
import { createGodotMemberNodeTypes } from './symbols/godotMembers';
import { createSymbolMemberNodeTypes } from './symbols/members';
import { createSymbolRootNodeType } from './symbols/root';
import { createSymbolScopeNodeTypes } from './symbols/scopes';
import { createSymbolSumTypeNodeTypes } from './symbols/sumTypes';

export function createSymbolGraphNodeTypes(): IGraphNodeTypeDefinition[] {
  const callables = createSymbolCallableNodeTypes();
  const members = createSymbolMemberNodeTypes();
  const scopes = createSymbolScopeNodeTypes();
  const composition = createSymbolCompositionNodeTypes();
  const data = createSymbolDataNodeTypes();
  const events = createSymbolEventNodeTypes();
  const sumTypes = createSymbolSumTypeNodeTypes();
  const aliases = createSymbolAliasNodeTypes();

  return [
    createSymbolRootNodeType(),
    callables.functionNodeType,
    scopes.namespaceNodeType,
    callables.callableNodeType,
    members.methodNodeType,
    members.constructorNodeType,
    callables.prototypeNodeType,
    scopes.classNodeType,
    composition.mixinNodeType,
    composition.extensionNodeType,
    scopes.interfaceNodeType,
    data.recordNodeType,
    events.delegateNodeType,
    members.propertyNodeType,
    events.eventNodeType,
    data.typeNodeType,
    data.structNodeType,
    sumTypes.unionNodeType,
    sumTypes.enumNodeType,
    aliases.typedefNodeType,
    aliases.aliasNodeType,
    composition.templateNodeType,
    ...createGodotAssetNodeTypes(),
    ...createGodotMemberNodeTypes(),
  ];
}
