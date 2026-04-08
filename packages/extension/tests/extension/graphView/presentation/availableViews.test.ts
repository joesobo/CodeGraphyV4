import { describe, expect, it } from 'vitest';
import type { IViewInfo } from '../../../../src/core/views/contracts';
import { mapAvailableViews } from '../../../../src/extension/graphView/presentation/availableViews';

describe('graphView/presentation/availableViews', () => {
  it('marks the active view in the payload', () => {
    const views = [
      {
        core: true,
        order: 0,
        view: {
          id: 'codegraphy.connections',
          name: 'Connections',
          icon: 'symbol-file',
          description: 'Default view',
          transform: () => ({ nodes: [], edges: [] }),
        },
      },
      {
        core: false,
        order: 1,
        view: {
          id: 'codegraphy.folder',
          name: 'Folder',
          icon: 'folder',
          description: 'Folder view',
          transform: () => ({ nodes: [], edges: [] }),
        },
      },
    ] satisfies IViewInfo[];

    expect(mapAvailableViews(views, 'codegraphy.folder')).toEqual([
      {
        id: 'codegraphy.connections',
        name: 'Connections',
        icon: 'symbol-file',
        description: 'Default view',
        active: false,
      },
      {
        id: 'codegraphy.folder',
        name: 'Folder',
        icon: 'folder',
        description: 'Folder view',
        active: true,
      },
    ]);
  });

  it('hides internal toolbar-only views from the generic view payload', () => {
    const views = [
      {
        core: true,
        order: 0,
        view: {
          id: 'codegraphy.connections',
          name: 'Connections',
          icon: 'symbol-file',
          description: 'Default view',
          transform: () => ({ nodes: [], edges: [] }),
        },
      },
      {
        core: true,
        order: 1,
        view: {
          id: 'codegraphy.depth-graph',
          name: 'Depth Graph',
          icon: 'target',
          description: 'Focused graph',
          transform: () => ({ nodes: [], edges: [] }),
        },
      },
    ] satisfies IViewInfo[];

    expect(mapAvailableViews(views, 'codegraphy.depth-graph')).toEqual([
      {
        id: 'codegraphy.connections',
        name: 'Connections',
        icon: 'symbol-file',
        description: 'Default view',
        active: false,
      },
    ]);
  });
});
