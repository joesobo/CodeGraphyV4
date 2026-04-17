import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IGraphData } from '../../../src/shared/graph/contracts';
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

  describe('baseGraphView properties', () => {
    it('has id codegraphy.graph', async () => {
      const { baseGraphView } = await import('../../../src/core/views/catalog');
      expect(baseGraphView.id).toBe('codegraphy.graph');
    });

    it('has name Graph', async () => {
      const { baseGraphView } = await import('../../../src/core/views/catalog');
      expect(baseGraphView.name).toBe('Graph');
    });

    it('has icon symbol-file', async () => {
      const { baseGraphView } = await import('../../../src/core/views/catalog');
      expect(baseGraphView.icon).toBe('symbol-file');
    });

    it('has a unified-graph description', async () => {
      const { baseGraphView } = await import('../../../src/core/views/catalog');
      expect(baseGraphView.description).toBe('Base graph transform for the unified graph surface');
    });

    it('has a transform function', async () => {
      const { baseGraphView } = await import('../../../src/core/views/catalog');
      expect(typeof baseGraphView.transform).toBe('function');
    });

    it('has no pluginId', async () => {
      const { baseGraphView } = await import('../../../src/core/views/catalog');
      expect(baseGraphView.pluginId).toBeUndefined();
    });

    it('passes through data unchanged', async () => {
      const { baseGraphView } = await import('../../../src/core/views/catalog');
      const context = createContext();
      const result = baseGraphView.transform(sampleGraphData, context);
      expect(result).toBe(sampleGraphData);
    });
  });

  describe('coreViews array', () => {
    it('contains exactly one built-in view', async () => {
      const { coreViews } = await import('../../../src/core/views/catalog');
      expect(coreViews).toHaveLength(1);
    });

    it('contains the unified base graph transform', async () => {
      const { coreViews, baseGraphView } = await import('../../../src/core/views/catalog');
      expect(coreViews[0]).toBe(baseGraphView);
    });

    it('contains views with valid IView properties', async () => {
      const { coreViews } = await import('../../../src/core/views/catalog');
      for (const view of coreViews) {
        expect(view.id.length).toBeGreaterThan(0);
        expect(view.name.length).toBeGreaterThan(0);
        expect(view.icon.length).toBeGreaterThan(0);
        expect(view.description.length).toBeGreaterThan(0);
        expect(typeof view.transform).toBe('function');
      }
    });
  });
});
