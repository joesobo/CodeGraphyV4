import type { IGraphNodeTypeDefinition } from '../../../contracts';

type SymbolNodeTypeDefinition = Omit<
  IGraphNodeTypeDefinition,
  'defaultVisible' | 'parentId'
>;

export function createSymbolNodeType(
  definition: SymbolNodeTypeDefinition,
): IGraphNodeTypeDefinition {
  return {
    ...definition,
    defaultVisible: false,
    parentId: 'symbol',
  };
}

interface GodotSymbolNodeTypeDefinition extends Omit<
  SymbolNodeTypeDefinition,
  'matchSymbolKinds' | 'matchSymbolPluginKind' | 'matchSymbolSource' | 'pluginName'
> {
  pluginKind: string;
}

export function createGodotSymbolNodeType(
  definition: GodotSymbolNodeTypeDefinition,
): IGraphNodeTypeDefinition {
  const { pluginKind, ...nodeType } = definition;
  return createSymbolNodeType({
    ...nodeType,
    pluginName: 'Godot',
    matchSymbolKinds: [pluginKind],
    matchSymbolPluginKind: pluginKind,
    matchSymbolSource: 'codegraphy.gdscript',
  });
}
