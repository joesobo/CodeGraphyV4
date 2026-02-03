import { describe, it, expect } from 'vitest';
import {
  connectionsView,
  depthGraphView,
  subfolderView,
  coreViews,
} from '../../../src/core/views';
import { IGraphData } from '../../../src/shared/types';
import { IViewContext } from '../../../src/core/views';

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
    { id: 'src/app.ts->src/utils/helpers.ts', from: 'src/app.ts', to: 'src/utils/helpers.ts' },
    { id: 'src/app.ts->src/components/Button.tsx', from: 'src/app.ts', to: 'src/components/Button.tsx' },
    { id: 'src/utils/helpers.ts->src/utils/format.ts', from: 'src/utils/helpers.ts', to: 'src/utils/format.ts' },
    { id: 'tests/app.test.ts->src/app.ts', from: 'tests/app.test.ts', to: 'src/app.ts' },
  ],
};

function createContext(overrides: Partial<IViewContext> = {}): IViewContext {
  return {
    activePlugins: new Set(),
    ...overrides,
  };
}

describe('Core Views', () => {
  describe('coreViews array', () => {
    it('should contain all core views', () => {
      expect(coreViews).toHaveLength(3);
      expect(coreViews).toContain(connectionsView);
      expect(coreViews).toContain(depthGraphView);
      expect(coreViews).toContain(subfolderView);
    });
  });

  describe('connectionsView', () => {
    it('should have correct metadata', () => {
      expect(connectionsView.id).toBe('codegraphy.connections');
      expect(connectionsView.name).toBe('Connections');
      expect(connectionsView.icon).toBe('symbol-file');
      expect(connectionsView.pluginId).toBeUndefined();
    });

    it('should pass through data unchanged', () => {
      const context = createContext();
      const result = connectionsView.transform(sampleGraphData, context);

      expect(result).toBe(sampleGraphData);
      expect(result.nodes).toHaveLength(5);
      expect(result.edges).toHaveLength(4);
    });
  });

  describe('depthGraphView', () => {
    it('should have correct metadata', () => {
      expect(depthGraphView.id).toBe('codegraphy.depth-graph');
      expect(depthGraphView.name).toBe('Depth Graph');
      expect(depthGraphView.icon).toBe('target');
      expect(depthGraphView.pluginId).toBeUndefined();
    });

    it('should return empty graph when no file is focused', () => {
      const context = createContext({ focusedFile: undefined });
      const result = depthGraphView.transform(sampleGraphData, context);

      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it('should return focused file and immediate connections with default depth 1', () => {
      const context = createContext({ focusedFile: 'src/app.ts' });
      const result = depthGraphView.transform(sampleGraphData, context);

      // app.ts connects to: helpers.ts, Button.tsx, and is imported by app.test.ts
      expect(result.nodes).toHaveLength(4);
      expect(result.nodes.map(n => n.id)).toContain('src/app.ts');
      expect(result.nodes.map(n => n.id)).toContain('src/utils/helpers.ts');
      expect(result.nodes.map(n => n.id)).toContain('src/components/Button.tsx');
      expect(result.nodes.map(n => n.id)).toContain('tests/app.test.ts');

      // Should include edges to/from the focused file
      expect(result.edges).toHaveLength(3);
    });

    it('should filter to only 1-hop connections with default depth', () => {
      // format.ts is 2 hops from app.ts (app -> helpers -> format)
      const context = createContext({ focusedFile: 'src/app.ts' });
      const result = depthGraphView.transform(sampleGraphData, context);

      expect(result.nodes.map(n => n.id)).not.toContain('src/utils/format.ts');
    });

    it('should include 2-hop nodes when depthLimit is 2', () => {
      // format.ts is 2 hops from app.ts (app -> helpers -> format)
      const context = createContext({ focusedFile: 'src/app.ts', depthLimit: 2 });
      const result = depthGraphView.transform(sampleGraphData, context);

      // Should now include format.ts
      expect(result.nodes).toHaveLength(5);
      expect(result.nodes.map(n => n.id)).toContain('src/utils/format.ts');
      
      // Should include the edge from helpers to format
      expect(result.edges).toHaveLength(4);
    });

    it('should annotate nodes with depthLevel', () => {
      const context = createContext({ focusedFile: 'src/app.ts', depthLimit: 2 });
      const result = depthGraphView.transform(sampleGraphData, context);

      // Check depth levels
      const appNode = result.nodes.find(n => n.id === 'src/app.ts');
      expect(appNode?.depthLevel).toBe(0); // Focused node

      const helpersNode = result.nodes.find(n => n.id === 'src/utils/helpers.ts');
      expect(helpersNode?.depthLevel).toBe(1); // 1 hop

      const formatNode = result.nodes.find(n => n.id === 'src/utils/format.ts');
      expect(formatNode?.depthLevel).toBe(2); // 2 hops
    });

    it('should work with depth 3 to include all nodes in chain', () => {
      // Create a longer chain for testing
      const chainData: IGraphData = {
        nodes: [
          { id: 'a', label: 'a', color: '#fff' },
          { id: 'b', label: 'b', color: '#fff' },
          { id: 'c', label: 'c', color: '#fff' },
          { id: 'd', label: 'd', color: '#fff' },
        ],
        edges: [
          { id: 'a->b', from: 'a', to: 'b' },
          { id: 'b->c', from: 'b', to: 'c' },
          { id: 'c->d', from: 'c', to: 'd' },
        ],
      };

      const context = createContext({ focusedFile: 'a', depthLimit: 3 });
      const result = depthGraphView.transform(chainData, context);

      // All nodes should be included
      expect(result.nodes).toHaveLength(4);
      expect(result.nodes.map(n => n.id)).toEqual(expect.arrayContaining(['a', 'b', 'c', 'd']));

      // Check depth levels
      expect(result.nodes.find(n => n.id === 'a')?.depthLevel).toBe(0);
      expect(result.nodes.find(n => n.id === 'b')?.depthLevel).toBe(1);
      expect(result.nodes.find(n => n.id === 'c')?.depthLevel).toBe(2);
      expect(result.nodes.find(n => n.id === 'd')?.depthLevel).toBe(3);
    });

    it('should handle depth 1 explicitly', () => {
      const context = createContext({ focusedFile: 'src/app.ts', depthLimit: 1 });
      const result = depthGraphView.transform(sampleGraphData, context);

      // Same as default, should not include format.ts
      expect(result.nodes).toHaveLength(4);
      expect(result.nodes.map(n => n.id)).not.toContain('src/utils/format.ts');
    });

    it('should handle focused file not in graph', () => {
      const context = createContext({ focusedFile: 'nonexistent.ts', depthLimit: 1 });
      const result = depthGraphView.transform(sampleGraphData, context);

      // Should return empty since the focused file doesn't exist
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it('should traverse bidirectionally (both imports and imported-by)', () => {
      // helpers.ts is imported by app.ts and imports format.ts
      // Starting from helpers.ts at depth 1, we should see both app.ts and format.ts
      const context = createContext({ focusedFile: 'src/utils/helpers.ts', depthLimit: 1 });
      const result = depthGraphView.transform(sampleGraphData, context);

      expect(result.nodes).toHaveLength(3);
      expect(result.nodes.map(n => n.id)).toContain('src/utils/helpers.ts');
      expect(result.nodes.map(n => n.id)).toContain('src/app.ts'); // imports helpers
      expect(result.nodes.map(n => n.id)).toContain('src/utils/format.ts'); // imported by helpers
    });

    it('should be unavailable when no file is focused', () => {
      const context = createContext({ focusedFile: undefined });
      expect(depthGraphView.isAvailable?.(context)).toBe(false);
    });

    it('should be available when a file is focused', () => {
      const context = createContext({ focusedFile: 'src/app.ts' });
      expect(depthGraphView.isAvailable?.(context)).toBe(true);
    });

    it('should preserve nodeSizeMode in output', () => {
      const dataWithMode: IGraphData = { ...sampleGraphData, nodeSizeMode: 'file-size' };
      const context = createContext({ focusedFile: 'src/app.ts', depthLimit: 1 });
      const result = depthGraphView.transform(dataWithMode, context);

      expect(result.nodeSizeMode).toBe('file-size');
    });
  });

  describe('subfolderView', () => {
    it('should have correct metadata', () => {
      expect(subfolderView.id).toBe('codegraphy.subfolder');
      expect(subfolderView.name).toBe('Subfolder View');
      expect(subfolderView.icon).toBe('folder');
      expect(subfolderView.pluginId).toBeUndefined();
    });

    it('should return all data when no folder is selected', () => {
      const context = createContext({ selectedFolder: undefined });
      const result = subfolderView.transform(sampleGraphData, context);

      expect(result).toBe(sampleGraphData);
    });

    it('should filter to only files in selected folder', () => {
      const context = createContext({ selectedFolder: 'src/utils' });
      const result = subfolderView.transform(sampleGraphData, context);

      // Only helpers.ts and format.ts are in src/utils
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes.map(n => n.id)).toContain('src/utils/helpers.ts');
      expect(result.nodes.map(n => n.id)).toContain('src/utils/format.ts');

      // Only the edge between helpers and format
      expect(result.edges).toHaveLength(1);
    });

    it('should handle folder path without trailing slash', () => {
      const context = createContext({ selectedFolder: 'src' });
      const result = subfolderView.transform(sampleGraphData, context);

      // All src files: app.ts, helpers.ts, format.ts, Button.tsx
      expect(result.nodes).toHaveLength(4);
    });

    it('should handle folder path with trailing slash', () => {
      const context = createContext({ selectedFolder: 'src/' });
      const result = subfolderView.transform(sampleGraphData, context);

      expect(result.nodes).toHaveLength(4);
    });

    it('should be unavailable when no folder is selected', () => {
      const context = createContext({ selectedFolder: undefined });
      expect(subfolderView.isAvailable?.(context)).toBe(false);
    });

    it('should be available when a folder is selected', () => {
      const context = createContext({ selectedFolder: 'src' });
      expect(subfolderView.isAvailable?.(context)).toBe(true);
    });

    it('should preserve nodeSizeMode in output', () => {
      const dataWithMode: IGraphData = { ...sampleGraphData, nodeSizeMode: 'file-size' };
      const context = createContext({ selectedFolder: 'src' });
      const result = subfolderView.transform(dataWithMode, context);

      expect(result.nodeSizeMode).toBe('file-size');
    });
  });
});
