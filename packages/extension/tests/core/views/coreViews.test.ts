import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IGraphData } from '../../../src/shared/graph/types';
import type { IViewContext } from '../../../src/core/views/contracts';

// Sample graph data for testing
const sampleGraphData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
    { id: 'src/utils/helpers.ts', label: 'helpers.ts', color: '#93C5FD' },
    { id: 'src/utils/format.ts', label: 'format.ts', color: '#93C5FD' },
    { id: 'src/components/Button.tsx', label: 'Button.tsx', color: '#67E8F9' },
    { id: 'tests/app.test.ts', label: 'app.test.ts', color: '#93C5FD' },
  ],
  edges: [
    { id: 'src/app.ts->src/utils/helpers.ts', from: 'src/app.ts', to: 'src/utils/helpers.ts' , kind: 'import', sources: [] },
    { id: 'src/app.ts->src/components/Button.tsx', from: 'src/app.ts', to: 'src/components/Button.tsx' , kind: 'import', sources: [] },
    { id: 'src/utils/helpers.ts->src/utils/format.ts', from: 'src/utils/helpers.ts', to: 'src/utils/format.ts' , kind: 'import', sources: [] },
    { id: 'tests/app.test.ts->src/app.ts', from: 'tests/app.test.ts', to: 'src/app.ts' , kind: 'import', sources: [] },
  ],
};

function createContext(overrides: Partial<IViewContext> = {}): IViewContext {
  return {
    activePlugins: new Set(),
    ...overrides,
  };
}

describe('Core Views (fresh imports)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('connectionsView properties', () => {
    it('has id codegraphy.connections', async () => {
      const { connectionsView } = await import('../../../src/core/views/builtIns');
      expect(connectionsView.id).toBe('codegraphy.connections');
    });

    it('has name Connections', async () => {
      const { connectionsView } = await import('../../../src/core/views/builtIns');
      expect(connectionsView.name).toBe('Connections');
    });

    it('has icon symbol-file', async () => {
      const { connectionsView } = await import('../../../src/core/views/builtIns');
      expect(connectionsView.icon).toBe('symbol-file');
    });

    it('has description about import relationships', async () => {
      const { connectionsView } = await import('../../../src/core/views/builtIns');
      expect(connectionsView.description).toBe('Shows all files and their import relationships');
    });

    it('has a transform function', async () => {
      const { connectionsView } = await import('../../../src/core/views/builtIns');
      expect(typeof connectionsView.transform).toBe('function');
    });

    it('has no pluginId', async () => {
      const { connectionsView } = await import('../../../src/core/views/builtIns');
      expect(connectionsView.pluginId).toBeUndefined();
    });

    it('passes through data unchanged', async () => {
      const { connectionsView } = await import('../../../src/core/views/builtIns');
      const context = createContext();
      const result = connectionsView.transform(sampleGraphData, context);
      expect(result).toBe(sampleGraphData);
    });
  });

  describe('coreViews array', () => {
    it('contains exactly three views', async () => {
      const { coreViews } = await import('../../../src/core/views/builtIns');
      expect(coreViews).toHaveLength(3);
    });

    it('contains connectionsView, depthGraphView, and folderView in order', async () => {
      const { coreViews, connectionsView, depthGraphView, folderView } = await import('../../../src/core/views/builtIns');
      expect(coreViews[0]).toBe(connectionsView);
      expect(coreViews[1]).toBe(depthGraphView);
      expect(coreViews[2]).toBe(folderView);
    });

    it('contains views with valid IView properties', async () => {
      const { coreViews } = await import('../../../src/core/views/builtIns');
      for (const view of coreViews) {
        expect(view.id.length).toBeGreaterThan(0);
        expect(view.name.length).toBeGreaterThan(0);
        expect(view.icon.length).toBeGreaterThan(0);
        expect(view.description.length).toBeGreaterThan(0);
        expect(typeof view.transform).toBe('function');
      }
    });
  });

  describe('depthGraphView from builtIn re-export', () => {
    it('has id codegraphy.depth-graph', async () => {
      const { depthGraphView } = await import('../../../src/core/views/builtIns');
      expect(depthGraphView.id).toBe('codegraphy.depth-graph');
    });

    it('has name Depth Graph', async () => {
      const { depthGraphView } = await import('../../../src/core/views/builtIns');
      expect(depthGraphView.name).toBe('Depth Graph');
    });

    it('has icon target', async () => {
      const { depthGraphView } = await import('../../../src/core/views/builtIns');
      expect(depthGraphView.icon).toBe('target');
    });

    it('passes through the graph during the teardown phase', async () => {
      const { depthGraphView } = await import('../../../src/core/views/builtIns');
      const context = createContext({ focusedFile: undefined });
      const result = depthGraphView.transform(sampleGraphData, context);
      expect(result).toBe(sampleGraphData);
    });
  });
});
