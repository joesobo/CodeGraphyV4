import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FOLDER_NODE_COLOR,
  DEFAULT_NODE_COLOR,
  DEFAULT_PACKAGE_NODE_COLOR,
} from '../../../../src/shared/fileColors';
import {
  CORE_GRAPH_NODE_TYPES,
  createCoreGraphNodeTypes,
} from '../../../../src/shared/graphControls/defaults/nodeTypes';

describe('shared/graphControls/defaults/nodeTypes', () => {
  it('declares the core graph node defaults', () => {
    const nodeTypes = createCoreGraphNodeTypes();

    expect(nodeTypes).toMatchObject([
      {
        id: 'file',
        label: 'File',
        defaultColor: DEFAULT_NODE_COLOR,
        defaultVisible: true,
      },
      {
        id: 'folder',
        label: 'Folder',
        defaultColor: DEFAULT_FOLDER_NODE_COLOR,
        defaultVisible: false,
      },
      {
        id: 'package',
        label: 'Package',
        defaultColor: DEFAULT_PACKAGE_NODE_COLOR,
        defaultVisible: false,
      },
      {
        id: 'symbol',
        label: 'Symbol',
        defaultColor: '#7C3AED',
        defaultVisible: false,
      },
      {
        id: 'symbol:function',
        label: 'Function',
        defaultColor: '#8B5CF6',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['function', 'method'],
      },
      {
        id: 'symbol:namespace',
        label: 'Namespace',
        defaultColor: '#64748B',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['namespace'],
      },
      {
        id: 'symbol:callable',
        label: 'Callable',
        defaultColor: '#8B5CF6',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['function'],
      },
      {
        id: 'symbol:method',
        label: 'Method',
        defaultColor: '#A855F7',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['method'],
      },
      {
        id: 'symbol:constructor',
        label: 'Constructor',
        defaultColor: '#C084FC',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['constructor'],
      },
      {
        id: 'symbol:prototype',
        label: 'Prototype',
        defaultColor: '#A78BFA',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['prototype'],
      },
      {
        id: 'symbol:class',
        label: 'Class',
        defaultColor: '#3B82F6',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['class'],
      },
      {
        id: 'symbol:mixin',
        label: 'Mixin',
        defaultColor: '#2563EB',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['mixin'],
      },
      {
        id: 'symbol:extension',
        label: 'Extension',
        defaultColor: '#4F46E5',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['extension'],
      },
      {
        id: 'symbol:interface',
        label: 'Interface',
        defaultColor: '#06B6D4',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['interface'],
      },
      {
        id: 'symbol:record',
        label: 'Record',
        defaultColor: '#6366F1',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['record'],
      },
      {
        id: 'symbol:delegate',
        label: 'Delegate',
        defaultColor: '#10B981',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['delegate'],
      },
      {
        id: 'symbol:property',
        label: 'Property',
        defaultColor: '#84CC16',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['property'],
      },
      {
        id: 'symbol:event',
        label: 'Event',
        defaultColor: '#F97316',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['event'],
      },
      {
        id: 'symbol:type',
        label: 'Type',
        defaultColor: '#EC4899',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['type'],
      },
      {
        id: 'symbol:struct',
        label: 'Struct',
        defaultColor: '#0EA5E9',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['struct'],
      },
      {
        id: 'symbol:union',
        label: 'Union',
        defaultColor: '#14B8A6',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['union'],
      },
      {
        id: 'symbol:enum',
        label: 'Enum',
        defaultColor: '#F59E0B',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['enum'],
      },
      {
        id: 'symbol:typedef',
        label: 'Typedef',
        defaultColor: '#F472B6',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['typedef'],
      },
      {
        id: 'symbol:alias',
        label: 'Alias',
        defaultColor: '#F472B6',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['alias'],
      },
      {
        id: 'symbol:template',
        label: 'Template',
        defaultColor: '#C084FC',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['template'],
      },
      {
        id: 'plugin:codegraphy.gdscript:symbol:scene',
        label: 'Scene',
        defaultColor: '#478CBF',
        defaultVisible: false,
        parentId: 'symbol',
        pluginName: 'Godot',
        matchSymbolKinds: ['scene'],
        matchSymbolPluginKind: 'scene',
        matchSymbolSource: 'codegraphy.gdscript',
      },
      {
        id: 'plugin:codegraphy.gdscript:symbol:resource',
        label: 'Resource',
        defaultColor: '#F59E0B',
        defaultVisible: false,
        parentId: 'symbol',
        pluginName: 'Godot',
        matchSymbolKinds: ['resource'],
        matchSymbolPluginKind: 'resource',
        matchSymbolSource: 'codegraphy.gdscript',
      },
      {
        id: 'plugin:codegraphy.gdscript:symbol:autoload',
        label: 'Autoload',
        defaultColor: '#10B981',
        defaultVisible: false,
        parentId: 'symbol',
        pluginName: 'Godot',
        matchSymbolKinds: ['autoload'],
        matchSymbolPluginKind: 'autoload',
        matchSymbolSource: 'codegraphy.gdscript',
      },
      {
        id: 'plugin:codegraphy.gdscript:symbol:scene-node',
        label: 'Scene Node',
        defaultColor: '#A855F7',
        defaultVisible: false,
        parentId: 'symbol',
        pluginName: 'Godot',
        matchSymbolKinds: ['scene-node'],
        matchSymbolPluginKind: 'scene-node',
        matchSymbolSource: 'codegraphy.gdscript',
      },
      {
        id: 'plugin:codegraphy.gdscript:symbol:signal',
        label: 'Signal',
        defaultColor: '#EF4444',
        defaultVisible: false,
        parentId: 'symbol',
        pluginName: 'Godot',
        matchSymbolKinds: ['signal'],
        matchSymbolPluginKind: 'signal',
        matchSymbolSource: 'codegraphy.gdscript',
      },
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
      {
        id: 'plugin:codegraphy.unity:symbol',
        label: 'Unity',
        defaultColor: '#F97316',
        defaultVisible: false,
        pluginName: 'Unity',
        matchSymbolSource: 'codegraphy.unity',
        matchSymbolLanguage: 'unity',
      },
      {
        id: 'plugin:codegraphy.unity:symbol:game-object',
        label: 'GameObject',
        defaultColor: '#0EA5E9',
        defaultVisible: false,
        parentId: 'plugin:codegraphy.unity:symbol',
        pluginName: 'Unity',
        matchSymbolKinds: ['game-object'],
        matchSymbolPluginKind: 'game-object',
        matchSymbolSource: 'codegraphy.unity',
        matchSymbolLanguage: 'unity',
      },
      {
        id: 'plugin:codegraphy.unity:symbol:component',
        label: 'Component',
        defaultColor: '#22C55E',
        defaultVisible: false,
        parentId: 'plugin:codegraphy.unity:symbol',
        pluginName: 'Unity',
        matchSymbolKinds: ['component'],
        matchSymbolPluginKind: 'component',
        matchSymbolSource: 'codegraphy.unity',
        matchSymbolLanguage: 'unity',
      },
    ]);
    expect(nodeTypes.every((nodeType) => nodeType.description?.description)).toBe(true);
    expect(nodeTypes.find((nodeType) => nodeType.id === 'file')?.description?.examples?.[0]?.code)
      .toBe('src/components/Button.tsx');
    expect(nodeTypes.find((nodeType) => nodeType.id === 'symbol:function')?.description?.examples?.[0]?.code)
      .toBe('function parseSettings() {}');
    expect(nodeTypes.find((nodeType) => nodeType.id === 'symbol:namespace')?.description?.examples?.[0]?.code)
      .toBe('namespace taskrunner {}');
    expect(nodeTypes.find((nodeType) => nodeType.id === 'symbol:method')?.description?.examples?.[0]?.code)
      .toBe('std::size_t TaskRunner::run() {}');
    expect(nodeTypes.find((nodeType) => nodeType.id === 'symbol:constructor')?.description?.examples?.[0]?.code)
      .toBe('public TaskDispatcher(ITaskQueue queue) {}');
    expect(nodeTypes.find((nodeType) => nodeType.id === 'symbol:prototype')?.description?.examples?.[0]?.code)
      .toBe('void logger_flush(Logger *logger);');
    expect(nodeTypes.find((nodeType) => nodeType.id === 'symbol:record')?.description?.examples?.[0]?.code)
      .toBe('public record DispatchTask(TaskId Id);');
    expect(nodeTypes.find((nodeType) => nodeType.id === 'symbol:delegate')?.description?.examples?.[0]?.code)
      .toBe('public delegate void TaskCompleted();');
    expect(nodeTypes.find((nodeType) => nodeType.id === 'symbol:property')?.description?.examples?.[0]?.code)
      .toBe('public int Count { get; }');
    expect(nodeTypes.find((nodeType) => nodeType.id === 'symbol:event')?.description?.examples?.[0]?.code)
      .toBe('public event TaskCompleted? Completed;');
    expect(nodeTypes.find((nodeType) => nodeType.id === 'symbol:alias')?.description?.examples?.[0]?.code)
      .toBe('using TaskId = std::uint64_t;');
    expect(nodeTypes.find((nodeType) => nodeType.id === 'symbol:template')?.description?.examples?.[0]?.code)
      .toBe('template <typename Item> class TaskQueue {};');
    expect(nodeTypes.find((nodeType) => nodeType.id === 'symbol:global')?.description?.examples?.[0]?.code)
      .toBe('static int logger_output_enabled = 1;');
    expect(nodeTypes.find((nodeType) => nodeType.id === 'symbol:field')?.description?.examples?.[0]?.code)
      .toBe('PendingTaskQueue queue_;');
    expect(nodeTypes.find((nodeType) => nodeType.id === 'symbol:parameter')?.description?.examples?.[0]?.code)
      .toBe('void enqueue(Task task);');
    expect(nodeTypes.find((nodeType) => nodeType.id === 'symbol:local')?.description?.examples?.[0]?.code)
      .toBe('TaskList tasks;');
    expect(nodeTypes.find((nodeType) => nodeType.id === 'symbol')?.description?.examples).toBeUndefined();
    expect(nodeTypes.find((nodeType) => nodeType.id === 'variable')?.description?.examples).toBeUndefined();
    expect(CORE_GRAPH_NODE_TYPES).toEqual(createCoreGraphNodeTypes());
  });
});
