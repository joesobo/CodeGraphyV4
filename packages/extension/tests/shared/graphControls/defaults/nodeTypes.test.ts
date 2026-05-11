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
        label: 'Files',
        defaultColor: DEFAULT_NODE_COLOR,
        defaultVisible: true,
      },
      {
        id: 'folder',
        label: 'Folders',
        defaultColor: DEFAULT_FOLDER_NODE_COLOR,
        defaultVisible: false,
      },
      {
        id: 'package',
        label: 'Packages',
        defaultColor: DEFAULT_PACKAGE_NODE_COLOR,
        defaultVisible: false,
      },
      {
        id: 'symbol',
        label: 'Symbols',
        defaultColor: '#8B5CF6',
        defaultVisible: false,
      },
      {
        id: 'symbol:function',
        label: 'Functions',
        defaultColor: '#8B5CF6',
        defaultVisible: true,
        parentId: 'symbol',
      },
      {
        id: 'symbol:method',
        label: 'Methods',
        defaultColor: '#A855F7',
        defaultVisible: true,
        parentId: 'symbol',
      },
      {
        id: 'symbol:class',
        label: 'Classes',
        defaultColor: '#3B82F6',
        defaultVisible: true,
        parentId: 'symbol',
      },
      {
        id: 'symbol:interface',
        label: 'Interfaces',
        defaultColor: '#06B6D4',
        defaultVisible: true,
        parentId: 'symbol',
      },
      {
        id: 'symbol:type',
        label: 'Types',
        defaultColor: '#EC4899',
        defaultVisible: true,
        parentId: 'symbol',
      },
      {
        id: 'symbol:struct',
        label: 'Structs',
        defaultColor: '#0EA5E9',
        defaultVisible: true,
        parentId: 'symbol',
      },
      {
        id: 'symbol:enum',
        label: 'Enums',
        defaultColor: '#F59E0B',
        defaultVisible: true,
        parentId: 'symbol',
      },
      {
        id: 'symbol:namespace',
        label: 'Namespaces',
        defaultColor: '#64748B',
        defaultVisible: true,
        parentId: 'symbol',
      },
      {
        id: 'variable',
        label: 'Variables',
        defaultColor: '#14B8A6',
        defaultVisible: false,
      },
      {
        id: 'symbol:variable',
        label: 'Variable Symbols',
        defaultColor: '#14B8A6',
        defaultVisible: true,
        parentId: 'variable',
      },
      {
        id: 'symbol:constant',
        label: 'Constants',
        defaultColor: '#22C55E',
        defaultVisible: true,
        parentId: 'variable',
      },
      {
        id: 'symbol:property',
        label: 'Properties',
        defaultColor: '#84CC16',
        defaultVisible: true,
        parentId: 'variable',
      },
    ]);
    expect(CORE_GRAPH_NODE_TYPES).toEqual(createCoreGraphNodeTypes());
  });
});
