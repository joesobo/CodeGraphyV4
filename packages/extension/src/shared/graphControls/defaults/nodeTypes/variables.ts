import type { IGraphNodeTypeDefinition } from '../../contracts';

export function createVariableGraphNodeTypes(): IGraphNodeTypeDefinition[] {
  return [
    {
      id: 'variable',
      label: 'Variable',
      defaultColor: '#14B8A6',
      defaultVisible: false,
      description: {
        description: 'Named values or fields that code can read or write.',
        examples: [{ code: 'const graphScope = buildScope();' }],
      },
    },
    {
      id: 'symbol:constant',
      label: 'Constant',
      defaultColor: '#22C55E',
      defaultVisible: false,
      parentId: 'variable',
      description: {
        description: 'Named values intended to stay unchanged.',
        examples: [{ code: 'const DEFAULT_MAX_FILES = 5000;' }],
      },
    },
    {
      id: 'symbol:global',
      label: 'Global',
      defaultColor: '#0D9488',
      defaultVisible: false,
      parentId: 'variable',
      description: {
        description: 'File-scope variables declared outside functions.',
        examples: [{ label: 'C', code: 'static int logger_output_enabled = 1;' }],
      },
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
      description: {
        description: 'Godot script class names registered for use elsewhere in a project.',
        examples: [{ label: 'GDScript', code: 'class_name PlayerController' }],
      },
    },
  ];
}
