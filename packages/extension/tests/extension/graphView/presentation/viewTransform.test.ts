import { describe, expect, it, vi } from 'vitest';
import { ViewRegistry } from '../../../../src/core/views/registry';
import type { IViewInfo } from '../../../../src/core/views/contracts';
import type { IViewContext } from '../../../../src/core/views/contracts';
import type { IGraphData } from '../../../../src/shared/graph/types';
import { applyGraphViewTransform } from '../../../../src/extension/graphView/presentation/viewTransform';

const viewContext: IViewContext = { activePlugins: new Set<string>() };
const rawGraphData: IGraphData = { nodes: [], edges: [] };

describe('graphView/presentation/viewTransform', () => {
  it('falls back to the default view when the active view is unavailable', () => {
    const registry = new ViewRegistry();
    registry.register(
      {
        id: 'codegraphy.connections',
        name: 'Connections',
        icon: 'symbol-file',
        description: 'Default view',
        transform: () => ({ nodes: [], edges: [] }),
      },
      { core: true, isDefault: true },
    );

    expect(applyGraphViewTransform(registry, 'missing.view', viewContext, rawGraphData)).toEqual({
      activeViewId: 'codegraphy.connections',
      graphData: { nodes: [], edges: [] },
      persistSelectedViewId: 'codegraphy.connections',
    });
  });

  it('keeps the active view when it is available', () => {
    const registry = new ViewRegistry();
    registry.register(
      {
        id: 'codegraphy.connections',
        name: 'Connections',
        icon: 'symbol-file',
        description: 'Default view',
        transform: (graphData) => graphData,
      },
      { core: true, isDefault: true },
    );
    registry.register({
      id: 'codegraphy.folder',
      name: 'Folder',
      icon: 'folder',
      description: 'Folder view',
      transform: () => ({ nodes: [{ id: 'folder', label: 'folder', color: '#000000' }], edges: [] }),
    });

    expect(applyGraphViewTransform(registry, 'codegraphy.folder', viewContext, rawGraphData)).toEqual({
      activeViewId: 'codegraphy.folder',
      graphData: {
        nodes: [{ id: 'folder', label: 'folder', color: '#000000' }],
        edges: [],
      },
    });
  });

  it('falls back when the active view is registered but unavailable', () => {
    const registry = new ViewRegistry();
    registry.register(
      {
        id: 'codegraphy.connections',
        name: 'Connections',
        icon: 'symbol-file',
        description: 'Default view',
        transform: () => ({ nodes: [], edges: [] }),
      },
      { core: true, isDefault: true },
    );
    registry.register({
      id: 'codegraphy.depth-graph',
      name: 'Depth Graph',
      icon: 'git-commit',
      description: 'Focused graph',
      isAvailable: () => false,
      transform: () => ({
        nodes: [{ id: 'depth', label: 'depth', color: '#111111' }],
        edges: [],
      }),
    });

    expect(
      applyGraphViewTransform(registry, 'codegraphy.depth-graph', viewContext, rawGraphData),
    ).toEqual({
      activeViewId: 'codegraphy.connections',
      graphData: { nodes: [], edges: [] },
      persistSelectedViewId: 'codegraphy.connections',
    });
  });

  it('keeps raw graph data when the default view id matches the active view id', () => {
    const registry = new ViewRegistry();
    registry.register({
      id: 'missing.view',
      name: 'Missing View',
      icon: 'symbol-file',
      description: 'Unavailable fallback',
      isAvailable: () => false,
      transform: () => ({
        nodes: [{ id: 'fallback', label: 'fallback', color: '#000000' }],
        edges: [],
      }),
    });
    vi.spyOn(registry, 'getDefaultViewId').mockReturnValue('missing.view');

    expect(applyGraphViewTransform(registry, 'missing.view', viewContext, rawGraphData)).toEqual({
      activeViewId: 'missing.view',
      graphData: rawGraphData,
    });
  });

  it('uses the raw graph data when there is no fallback view', () => {
    const registry = {
      get: vi.fn(() => undefined),
      isViewAvailable: vi.fn(() => false),
      getDefaultViewId: vi.fn(() => 'codegraphy.connections'),
    };

    expect(applyGraphViewTransform(registry, 'missing.view', viewContext, rawGraphData)).toEqual({
      activeViewId: 'missing.view',
      graphData: rawGraphData,
    });
  });

  it('uses the raw graph data when the default view id matches the unavailable active view', () => {
    const registry = {
      get: vi.fn(() => undefined),
      isViewAvailable: vi.fn(() => false),
      getDefaultViewId: vi.fn(() => 'missing.view'),
    };

    expect(applyGraphViewTransform(registry, 'missing.view', viewContext, rawGraphData)).toEqual({
      activeViewId: 'missing.view',
      graphData: rawGraphData,
    });
  });

  it('does not apply the default transform when the default id matches the unavailable active view', () => {
    const transform = vi.fn(() => ({
      nodes: [{ id: 'fallback', label: 'fallback', color: '#000000' }],
      edges: [],
    }));
    const fallbackView: IViewInfo = {
      core: true,
      order: 0,
      view: {
        id: 'missing.view',
        name: 'Missing',
        icon: 'symbol-file',
        description: 'Unavailable view',
        transform,
      },
    };
    const registry = {
      get: vi.fn((viewId: string) => (viewId === 'missing.view' ? fallbackView : undefined)),
      isViewAvailable: vi.fn(() => false),
      getDefaultViewId: vi.fn(() => 'missing.view'),
    };

    expect(applyGraphViewTransform(registry, 'missing.view', viewContext, rawGraphData)).toEqual({
      activeViewId: 'missing.view',
      graphData: rawGraphData,
    });
    expect(transform).not.toHaveBeenCalled();
  });

  it('uses the raw graph data when the default view id is falsy', () => {
    const fallbackView: IViewInfo = {
      core: false,
      order: 0,
      view: {
        id: '',
        name: 'Fallback',
        icon: 'symbol-file',
        description: 'Fallback view',
        transform: () => ({
          nodes: [{ id: 'fallback', label: 'fallback', color: '#000000' }],
          edges: [],
        }),
      },
    };
    const registry = {
      get: vi.fn((viewId: string) => (viewId === '' ? fallbackView : undefined)),
      isViewAvailable: vi.fn(() => false),
      getDefaultViewId: vi.fn(() => ''),
    };

    expect(applyGraphViewTransform(registry, 'missing.view', viewContext, rawGraphData)).toEqual({
      activeViewId: 'missing.view',
      graphData: rawGraphData,
    });
  });
});
