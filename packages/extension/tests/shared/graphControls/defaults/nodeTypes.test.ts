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
    expect(createCoreGraphNodeTypes()).toEqual([
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
      },
      {
        id: 'symbol:enum',
        label: 'Enum',
        defaultColor: '#F59E0B',
        defaultVisible: false,
        parentId: 'symbol',
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
    expect(CORE_GRAPH_NODE_TYPES).toEqual(createCoreGraphNodeTypes());
  });
});
