import { describe, it, expect } from 'vitest';
import { folderView } from '../../../src/core/views/builtIn';
import { IGraphData, DEFAULT_FOLDER_NODE_COLOR } from '../../../src/shared/types';
import { IViewContext } from '../../../src/core/views/types';

const defaultContext: IViewContext = {
  activePlugins: new Set(),
};

describe('folderView', () => {
  it('has correct metadata', () => {
    expect(folderView.id).toBe('codegraphy.folder');
    expect(folderView.name).toBe('Folder');
    expect(folderView.icon).toBe('folder');
    expect(folderView.description).toBe('Shows the folder containment hierarchy');
  });

  it('has a non-empty id', () => {
    expect(folderView.id.length).toBeGreaterThan(0);
  });

  it('has a non-empty name', () => {
    expect(folderView.name.length).toBeGreaterThan(0);
  });

  it('has a non-empty description', () => {
    expect(folderView.description.length).toBeGreaterThan(0);
  });

  it('has a non-empty icon', () => {
    expect(folderView.icon.length).toBeGreaterThan(0);
  });

  it('has a transform function', () => {
    expect(typeof folderView.transform).toBe('function');
  });

  it('exposes all required IView fields', () => {
    expect(folderView).toEqual(
      expect.objectContaining({
        id: 'codegraphy.folder',
        name: 'Folder',
        icon: 'folder',
        description: 'Shows the folder containment hierarchy',
      }),
    );
  });

  it('is always available (no isAvailable guard)', () => {
    expect(folderView.isAvailable).toBeUndefined();
  });

  it('returns empty output for empty input', () => {
    const input: IGraphData = { nodes: [], edges: [] };
    const result = folderView.transform(input, defaultContext);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it('extracts basic folder from file paths', () => {
    const input: IGraphData = {
      nodes: [
        { id: 'src/App.ts', label: 'App.ts', color: '#93C5FD' },
        { id: 'src/index.ts', label: 'index.ts', color: '#93C5FD' },
      ],
      edges: [
        { id: 'src/App.ts->src/index.ts', from: 'src/App.ts', to: 'src/index.ts' },
      ],
    };

    const result = folderView.transform(input, defaultContext);

    // Should have 1 folder node (src) + 2 file nodes
    const folderNodes = result.nodes.filter(n => n.nodeType === 'folder');
    const fileNodes = result.nodes.filter(n => n.nodeType === 'file');

    expect(folderNodes).toHaveLength(1);
    expect(folderNodes[0].id).toBe('src');
    expect(folderNodes[0].label).toBe('src');
    expect(folderNodes[0].color).toBe(DEFAULT_FOLDER_NODE_COLOR);

    expect(fileNodes).toHaveLength(2);
  });

  it('assigns (root) parent to root-level files', () => {
    const input: IGraphData = {
      nodes: [
        { id: 'package.json', label: 'package.json', color: '#86EFAC' },
        { id: 'tsconfig.json', label: 'tsconfig.json', color: '#86EFAC' },
      ],
      edges: [],
    };

    const result = folderView.transform(input, defaultContext);

    const rootFolder = result.nodes.find(n => n.id === '(root)');
    expect(rootFolder).toBeDefined();
    expect(rootFolder!.nodeType).toBe('folder');
    expect(rootFolder!.label).toBe('(root)');

    // Should have edges from (root) to each file
    const rootEdges = result.edges.filter(e => e.from === '(root)');
    expect(rootEdges).toHaveLength(2);
    expect(rootEdges.map(e => e.to).sort()).toEqual(['package.json', 'tsconfig.json']);
  });

  it('creates all ancestor folders for deep nesting', () => {
    const input: IGraphData = {
      nodes: [
        { id: 'a/b/c/file.ts', label: 'file.ts', color: '#93C5FD' },
      ],
      edges: [],
    };

    const result = folderView.transform(input, defaultContext);

    const folderNodes = result.nodes.filter(n => n.nodeType === 'folder');
    const folderIds = folderNodes.map(n => n.id).sort();

    // Should create a, a/b, a/b/c
    expect(folderIds).toEqual(['a', 'a/b', 'a/b/c']);

    // Check labels are last segment
    expect(folderNodes.find(n => n.id === 'a')!.label).toBe('a');
    expect(folderNodes.find(n => n.id === 'a/b')!.label).toBe('b');
    expect(folderNodes.find(n => n.id === 'a/b/c')!.label).toBe('c');
  });

  it('sets nodeType to folder on folder nodes and file on file nodes', () => {
    const input: IGraphData = {
      nodes: [
        { id: 'src/main.ts', label: 'main.ts', color: '#93C5FD' },
      ],
      edges: [],
    };

    const result = folderView.transform(input, defaultContext);

    for (const node of result.nodes) {
      expect(node.nodeType).toBeDefined();
      expect(['file', 'folder']).toContain(node.nodeType);
    }

    const srcNode = result.nodes.find(n => n.id === 'src');
    expect(srcNode!.nodeType).toBe('folder');

    const fileNode = result.nodes.find(n => n.id === 'src/main.ts');
    expect(fileNode!.nodeType).toBe('file');
  });

  it('produces only containment edges (no import edges preserved)', () => {
    const input: IGraphData = {
      nodes: [
        { id: 'src/a.ts', label: 'a.ts', color: '#93C5FD' },
        { id: 'src/b.ts', label: 'b.ts', color: '#93C5FD' },
        { id: 'lib/c.ts', label: 'c.ts', color: '#93C5FD' },
      ],
      edges: [
        { id: 'src/a.ts->src/b.ts', from: 'src/a.ts', to: 'src/b.ts' },
        { id: 'src/a.ts->lib/c.ts', from: 'src/a.ts', to: 'lib/c.ts' },
      ],
    };

    const result = folderView.transform(input, defaultContext);

    // All edges should be containment: parent->child format
    for (const edge of result.edges) {
      expect(edge.id).toMatch(/^.+->.+$/);
      // The from should be a folder that exists in the node list
      const fromNode = result.nodes.find(n => n.id === edge.from);
      expect(fromNode).toBeDefined();
      expect(fromNode!.nodeType).toBe('folder');
    }

    // Original import edges should NOT be present
    const importEdge = result.edges.find(e => e.from === 'src/a.ts');
    expect(importEdge).toBeUndefined();
  });

  it('preserves all original file node properties', () => {
    const input: IGraphData = {
      nodes: [
        {
          id: 'src/App.ts',
          label: 'App.ts',
          color: '#93C5FD',
          x: 100,
          y: 200,
          fileSize: 1234,
          accessCount: 5,
          favorite: true,
        },
      ],
      edges: [],
    };

    const result = folderView.transform(input, defaultContext);

    const fileNode = result.nodes.find(n => n.id === 'src/App.ts');
    expect(fileNode).toBeDefined();
    expect(fileNode!.label).toBe('App.ts');
    expect(fileNode!.color).toBe('#93C5FD');
    expect(fileNode!.x).toBe(100);
    expect(fileNode!.y).toBe(200);
    expect(fileNode!.fileSize).toBe(1234);
    expect(fileNode!.accessCount).toBe(5);
    expect(fileNode!.favorite).toBe(true);
    expect(fileNode!.nodeType).toBe('file');
  });

  it('uses "parent->child" format for edge IDs', () => {
    const input: IGraphData = {
      nodes: [
        { id: 'src/utils/helper.ts', label: 'helper.ts', color: '#93C5FD' },
      ],
      edges: [],
    };

    const result = folderView.transform(input, defaultContext);

    const edgeIds = result.edges.map(e => e.id).sort();
    // src->src/utils, src/utils->src/utils/helper.ts
    expect(edgeIds).toEqual([
      'src->src/utils',
      'src/utils->src/utils/helper.ts',
    ]);
  });

  it('handles mixed root-level and nested files', () => {
    const input: IGraphData = {
      nodes: [
        { id: 'index.ts', label: 'index.ts', color: '#93C5FD' },
        { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
      ],
      edges: [
        { id: 'index.ts->src/app.ts', from: 'index.ts', to: 'src/app.ts' },
      ],
    };

    const result = folderView.transform(input, defaultContext);

    // Should have (root) and src folders
    const folderIds = result.nodes
      .filter(n => n.nodeType === 'folder')
      .map(n => n.id)
      .sort();
    expect(folderIds).toEqual(['(root)', 'src']);

    // (root)->index.ts edge
    expect(result.edges.find(e => e.from === '(root)' && e.to === 'index.ts')).toBeDefined();
    // src->src/app.ts edge
    expect(result.edges.find(e => e.from === 'src' && e.to === 'src/app.ts')).toBeDefined();

    // No import edge from index.ts to src/app.ts
    expect(result.edges.find(e => e.from === 'index.ts')).toBeUndefined();
  });

  it('applies DEFAULT_FOLDER_NODE_COLOR to all folder nodes', () => {
    const input: IGraphData = {
      nodes: [
        { id: 'src/components/A.ts', label: 'A.ts', color: '#93C5FD' },
        { id: 'lib/utils/B.ts', label: 'B.ts', color: '#67E8F9' },
        { id: 'index.ts', label: 'index.ts', color: '#86EFAC' },
      ],
      edges: [],
    };

    const result = folderView.transform(input, defaultContext);
    const folderNodes = result.nodes.filter(n => n.nodeType === 'folder');

    expect(folderNodes.length).toBeGreaterThan(0);
    for (const folder of folderNodes) {
      expect(folder.color).toBe(DEFAULT_FOLDER_NODE_COLOR);
    }
  });

  it('uses custom folderNodeColor from context when provided', () => {
    const input: IGraphData = {
      nodes: [{ id: 'src/main.ts', label: 'main.ts', color: '#93C5FD' }],
      edges: [],
    };

    const customContext: IViewContext = {
      activePlugins: new Set(),
      folderNodeColor: '#FF0000',
    };

    const result = folderView.transform(input, customContext);
    const folderNodes = result.nodes.filter(n => n.nodeType === 'folder');

    for (const folder of folderNodes) {
      expect(folder.color).toBe('#FF0000');
    }
  });

  it('removes all file-to-file import edges', () => {
    const input: IGraphData = {
      nodes: [
        { id: 'src/a.ts', label: 'a.ts', color: '#93C5FD' },
        { id: 'src/b.ts', label: 'b.ts', color: '#93C5FD' },
        { id: 'lib/c.ts', label: 'c.ts', color: '#93C5FD' },
      ],
      edges: [
        { id: 'src/a.ts->src/b.ts', from: 'src/a.ts', to: 'src/b.ts' },
        { id: 'src/a.ts->lib/c.ts', from: 'src/a.ts', to: 'lib/c.ts' },
      ],
    };

    const result = folderView.transform(input, defaultContext);

    // No edge should have a file node as its source
    for (const edge of result.edges) {
      const fromNode = result.nodes.find(n => n.id === edge.from);
      expect(fromNode!.nodeType).toBe('folder');
    }
  });

  it('handles folders with dots in their names', () => {
    const input: IGraphData = {
      nodes: [
        { id: 'src/my.lib/file.ts', label: 'file.ts', color: '#93C5FD' },
      ],
      edges: [],
    };

    const result = folderView.transform(input, defaultContext);
    const folderIds = result.nodes.filter(n => n.nodeType === 'folder').map(n => n.id).sort();

    expect(folderIds).toEqual(['src', 'src/my.lib']);
    expect(result.nodes.find(n => n.id === 'src/my.lib')!.label).toBe('my.lib');
  });

  it('returns non-empty output for a single node input', () => {
    const input: IGraphData = {
      nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' }],
      edges: [],
    };

    const result = folderView.transform(input, defaultContext);

    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.edges.length).toBeGreaterThan(0);
  });

  it('deduplicates shared folder ancestors across files', () => {
    const input: IGraphData = {
      nodes: [
        { id: 'src/components/A.ts', label: 'A.ts', color: '#93C5FD' },
        { id: 'src/components/B.ts', label: 'B.ts', color: '#93C5FD' },
        { id: 'src/utils/C.ts', label: 'C.ts', color: '#93C5FD' },
      ],
      edges: [],
    };

    const result = folderView.transform(input, defaultContext);

    const folderIds = result.nodes
      .filter(n => n.nodeType === 'folder')
      .map(n => n.id)
      .sort();

    // src, src/components, src/utils — no duplicates
    expect(folderIds).toEqual(['src', 'src/components', 'src/utils']);
  });
});
