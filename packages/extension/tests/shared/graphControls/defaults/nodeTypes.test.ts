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
        id: 'variable',
        label: 'Variables',
        defaultColor: '#14B8A6',
        defaultVisible: false,
      },
    ]);
    expect(CORE_GRAPH_NODE_TYPES).toEqual(createCoreGraphNodeTypes());
  });
});
