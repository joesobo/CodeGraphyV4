import { describe, expect, it, vi } from 'vitest';
import type { IViewContext } from '../../../../src/core/views/contracts';
import type { IGraphData } from '../../../../src/shared/graph/types';
import { applyGraphViewTransform } from '../../../../src/extension/graphView/presentation/viewTransform';

const viewContext: IViewContext = { activePlugins: new Set<string>() };
const rawGraphData: IGraphData = { nodes: [], edges: [] };

describe('graphView/presentation/viewTransform', () => {
  it('keeps the active view id and raw graph data when the registry is unavailable', () => {
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

  it('does not fall back to a different view when the active view is unavailable', () => {
    const registry = {
      get: vi.fn(() => undefined),
      isViewAvailable: vi.fn(() => false),
      getDefaultViewId: vi.fn(() => 'codegraphy.connections'),
    };

    expect(
      applyGraphViewTransform(registry, 'codegraphy.depth-graph', viewContext, rawGraphData),
    ).toEqual({
      activeViewId: 'codegraphy.depth-graph',
      graphData: rawGraphData,
    });
  });
});
