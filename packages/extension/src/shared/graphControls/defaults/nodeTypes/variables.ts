import type { IGraphNodeTypeDefinition } from '../../contracts';

export function createVariableGraphNodeTypes(): IGraphNodeTypeDefinition[] {
  return [
    {
      id: 'variable',
      label: 'Variable',
      defaultColor: '#14B8A6',
      defaultVisible: false,
      parentId: 'symbol',
      description: {
        description: 'Quick toggle for named values or fields that code can read or write.',
      },
    },
    {
      id: 'variable:plain',
      label: 'Plain Variable',
      defaultColor: '#14B8A6',
      defaultVisible: false,
      parentId: 'variable',
      matchSymbolKinds: ['variable'],
      description: {
        description: 'Variables that are not already represented by a more specific variable row.',
      },
    },
    {
      id: 'symbol:constant',
      label: 'Constant',
      defaultColor: '#22C55E',
      defaultVisible: false,
      parentId: 'variable',
      matchSymbolKinds: ['constant'],
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
      matchSymbolKinds: ['global'],
      description: {
        description: 'File-scope variables declared outside functions.',
        examples: [{ label: 'C', code: 'static int logger_output_enabled = 1;' }],
      },
    },
    {
      id: 'symbol:field',
      label: 'Field',
      defaultColor: '#84CC16',
      defaultVisible: false,
      parentId: 'variable',
      matchSymbolKinds: ['field'],
      description: {
        description: 'Named values stored on a class, struct, or similar type.',
        examples: [{ label: 'C++', code: 'PendingTaskQueue queue_;' }],
      },
    },
    {
      id: 'symbol:parameter',
      label: 'Parameter',
      defaultColor: '#2DD4BF',
      defaultVisible: false,
      parentId: 'variable',
      matchSymbolKinds: ['parameter'],
      description: {
        description: 'Named values passed into a callable.',
        examples: [{ label: 'C++', code: 'void enqueue(Task task);' }],
      },
    },
    {
      id: 'symbol:local',
      label: 'Local',
      defaultColor: '#10B981',
      defaultVisible: false,
      parentId: 'variable',
      matchSymbolKinds: ['local'],
      description: {
        description: 'Named values declared inside a callable body.',
        examples: [{ label: 'C++', code: 'TaskList tasks;' }],
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
      description: {
        description: 'GDScript variables exported to the Godot editor inspector.',
        examples: [{ label: 'GDScript', code: '@export var speed: float = 300.0' }],
      },
    },
  ];
}
