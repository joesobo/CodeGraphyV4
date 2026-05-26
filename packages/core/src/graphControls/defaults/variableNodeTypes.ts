import type { IGraphNodeTypeDefinition } from '../contracts';

export const CORE_VARIABLE_NODE_TYPES: IGraphNodeTypeDefinition[] = [
  {
    id: 'variable',
    label: 'Variable',
    defaultColor: '#14B8A6',
    defaultVisible: false,
  },
  {
    id: 'symbol:constant',
    label: 'Constant',
    defaultColor: '#22C55E',
    defaultVisible: false,
    parentId: 'variable',
  },
  {
    id: 'plugin:codegraphy.gdscript:symbol:godot-class-name',
    label: 'Godot class_name',
    defaultColor: '#478CBF',
    defaultVisible: false,
    parentId: 'variable',
    pluginName: 'Godot',
    matchSymbolKinds: ['class'],
    matchSymbolPluginKind: 'godot-class-name',
    matchSymbolSource: 'codegraphy.gdscript',
    matchSymbolLanguage: 'gdscript',
    matchSymbolFilePath: '**/*.gd',
  },
];
