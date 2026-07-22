import type { IGraphNodeTypeDefinition } from '../contracts';

export function createCoreVariableNodeTypes(): IGraphNodeTypeDefinition[] {
  return [
  {
    id: 'variable',
    label: 'Variable',
    defaultVisible: false,
    parentId: 'symbol',
  },
  {
    id: 'variable:plain',
    label: 'Plain Variable',
    defaultVisible: false,
    parentId: 'variable',
    matchSymbolKinds: ['variable'],
  },
  {
    id: 'symbol:constant',
    label: 'Constant',
    defaultVisible: false,
    parentId: 'variable',
    matchSymbolKinds: ['constant'],
  },
  {
    id: 'symbol:global',
    label: 'Global',
    defaultVisible: false,
    parentId: 'variable',
    matchSymbolKinds: ['global'],
  },
  {
    id: 'symbol:field',
    label: 'Field',
    defaultVisible: false,
    parentId: 'variable',
    matchSymbolKinds: ['field'],
  },
  {
    id: 'symbol:parameter',
    label: 'Parameter',
    defaultVisible: false,
    parentId: 'variable',
    matchSymbolKinds: ['parameter'],
  },
  {
    id: 'symbol:local',
    label: 'Local',
    defaultVisible: false,
    parentId: 'variable',
    matchSymbolKinds: ['local'],
  },
  {
    id: 'plugin:codegraphy.gdscript:symbol:godot-class-name',
    label: 'Godot class_name',
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
