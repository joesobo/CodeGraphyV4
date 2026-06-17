import type { IGraphNodeTypeDefinition } from '../contracts';

export function createCoreVariableNodeTypes(): IGraphNodeTypeDefinition[] {
  return [
  {
    id: 'variable',
    label: 'Variable',
    defaultColor: '#14B8A6',
    defaultVisible: false,
    parentId: 'symbol',
  },
  {
    id: 'variable:plain',
    label: 'Plain Variable',
    defaultColor: '#14B8A6',
    defaultVisible: false,
    parentId: 'variable',
    matchSymbolKinds: ['variable'],
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
    id: 'symbol:field',
    label: 'Field',
    defaultColor: '#84CC16',
    defaultVisible: false,
    parentId: 'variable',
    matchSymbolKinds: ['field'],
  },
  {
    id: 'symbol:parameter',
    label: 'Parameter',
    defaultColor: '#2DD4BF',
    defaultVisible: false,
    parentId: 'variable',
    matchSymbolKinds: ['parameter'],
  },
  {
    id: 'symbol:local',
    label: 'Local',
    defaultColor: '#10B981',
    defaultVisible: false,
    parentId: 'variable',
    matchSymbolKinds: ['local'],
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
  {
    id: 'plugin:codegraphy.gdscript:symbol:exported-property',
    label: 'Exported Property',
    defaultColor: '#2DD4BF',
    defaultVisible: false,
    parentId: 'variable',
    pluginName: 'Godot',
    matchSymbolKinds: ['variable'],
    matchSymbolPluginKind: 'exported-property',
    matchSymbolSource: 'codegraphy.gdscript',
    matchSymbolLanguage: 'gdscript',
    matchSymbolFilePath: '**/*.gd',
  },
  ];
}

export const CORE_VARIABLE_NODE_TYPES: IGraphNodeTypeDefinition[] = createCoreVariableNodeTypes();
