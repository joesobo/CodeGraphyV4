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
        id: 'symbol:include',
        label: 'Include',
        defaultColor: '#38BDF8',
        defaultVisible: false,
        parentId: 'symbol',
        matchSymbolKinds: ['include'],
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
      },
      {
        id: 'symbol:interface',
        label: 'Interface',
        defaultColor: '#06B6D4',
        defaultVisible: false,
        parentId: 'symbol',
      },
      {
        id: 'symbol:type',
        label: 'Type',
        defaultColor: '#EC4899',
        defaultVisible: false,
        parentId: 'symbol',
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
    ]);
    expect(nodeTypes.every((nodeType) => nodeType.description?.description)).toBe(true);
    expect(nodeTypes.find((nodeType) => nodeType.id === 'file')?.description?.examples?.[0]?.code)
      .toBe('src/components/Button.tsx');
    expect(nodeTypes.find((nodeType) => nodeType.id === 'symbol:function')?.description?.examples?.[0]?.code)
      .toBe('function parseSettings() {}');
    expect(nodeTypes.find((nodeType) => nodeType.id === 'symbol:prototype')?.description?.examples?.[0]?.code)
      .toBe('void logger_flush(Logger *logger);');
    expect(nodeTypes.find((nodeType) => nodeType.id === 'symbol:global')?.description?.examples?.[0]?.code)
      .toBe('static int logger_output_enabled = 1;');
    expect(CORE_GRAPH_NODE_TYPES).toEqual(createCoreGraphNodeTypes());
  });
});
