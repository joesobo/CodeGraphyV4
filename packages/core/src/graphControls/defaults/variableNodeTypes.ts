import type { IGraphNodeTypeDefinition } from '../contracts';

export const CORE_VARIABLE_NODE_TYPES: IGraphNodeTypeDefinition[] = [
  {
    id: 'variable',
    label: 'Variable',
    defaultColor: '#14B8A6',
    defaultVisible: false,
    parentId: 'symbol',
  },
  {
    id: 'symbol:constant',
    label: 'Constant',
    defaultColor: '#22C55E',
    defaultVisible: false,
    parentId: 'variable',
    matchSymbolKinds: ['constant'],
  },
  {
    id: 'symbol:global',
    label: 'Global',
    defaultColor: '#0D9488',
    defaultVisible: false,
    parentId: 'variable',
    matchSymbolKinds: ['global'],
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
