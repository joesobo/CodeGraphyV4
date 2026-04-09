import { describe, expect, it, vi } from 'vitest';
import type { IViewContext } from '../../../../src/core/views/contracts';
import type { IGraphData } from '../../../../src/shared/graph/types';
import { applyGraphViewTransform } from '../../../../src/extension/graphView/presentation/viewTransform';

const viewContext: IViewContext = { activePlugins: new Set<string>() };
const rawGraphData: IGraphData = { nodes: [], edges: [] };

describe('graphView/presentation/viewTransform', () => {
  it('keeps the raw graph data when the registry is unavailable', () => {
    const registry = {
      get: vi.fn(() => undefined),
      isViewAvailable: vi.fn(() => false),
      getDefaultViewId: vi.fn(() => 'codegraphy.connections'),
    };

    expect(applyGraphViewTransform(registry, viewContext, rawGraphData)).toEqual({
      graphData: rawGraphData,
    });
  });

  it('does not mutate the graph data when no transform applies', () => {
    const registry = {
      get: vi.fn(() => undefined),
      isViewAvailable: vi.fn(() => false),
      getDefaultViewId: vi.fn(() => 'codegraphy.connections'),
    };

    expect(applyGraphViewTransform(registry, viewContext, rawGraphData)).toEqual({
      graphData: rawGraphData,
    });
  });
});
