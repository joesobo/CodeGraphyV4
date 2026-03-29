import { describe, it, expect } from 'vitest';
import { buildContainmentEdges } from '../../../../src/core/views/folder/edges';

describe('buildContainmentEdges', () => {
  it('creates folder-to-subfolder edges for nested folders', () => {
    const folderPaths = new Set(['src', 'src/components']);
    const nodes = [{ id: 'src/components/App.ts', label: 'App.ts', color: '#fff' }];

    const edges = buildContainmentEdges(folderPaths, nodes);

    const folderToFolder = edges.find(e => e.from === 'src' && e.to === 'src/components');
    expect(folderToFolder).toBeDefined();
    expect(folderToFolder!.id).toBe('src->src/components');
  });

  it('creates folder-to-file edges for files in subdirectories', () => {
    const folderPaths = new Set(['src']);
    const nodes = [{ id: 'src/app.ts', label: 'app.ts', color: '#fff' }];

    const edges = buildContainmentEdges(folderPaths, nodes);

    const folderToFile = edges.find(e => e.from === 'src' && e.to === 'src/app.ts');
    expect(folderToFile).toBeDefined();
    expect(folderToFile!.id).toBe('src->src/app.ts');
  });

  it('creates (root)-to-file edges for root-level files', () => {
    const folderPaths = new Set(['(root)']);
    const nodes = [{ id: 'index.ts', label: 'index.ts', color: '#fff' }];

    const edges = buildContainmentEdges(folderPaths, nodes);

    const rootToFile = edges.find(e => e.from === '(root)' && e.to === 'index.ts');
    expect(rootToFile).toBeDefined();
    expect(rootToFile!.id).toBe('(root)->index.ts');
  });

  it('skips (root) when creating folder-to-subfolder edges', () => {
    const folderPaths = new Set(['(root)', 'src']);
    const nodes = [
      { id: 'index.ts', label: 'index.ts', color: '#fff' },
      { id: 'src/app.ts', label: 'app.ts', color: '#fff' },
    ];

    const edges = buildContainmentEdges(folderPaths, nodes);

    // There should be no edge with '(root)' as a subfolder target from folder loop
    const rootFolderEdge = edges.find(e => e.to === '(root)');
    expect(rootFolderEdge).toBeUndefined();
  });

  it('creates no folder-to-subfolder edges for single-segment folders', () => {
    const folderPaths = new Set(['src']);
    const nodes = [{ id: 'src/app.ts', label: 'app.ts', color: '#fff' }];

    const edges = buildContainmentEdges(folderPaths, nodes);

    // 'src' has only 1 segment, so no parent folder edge for 'src' itself
    const folderEdges = edges.filter(e => e.to === 'src');
    expect(folderEdges).toHaveLength(0);
  });

  it('returns an empty array when there are no folders and no nodes', () => {
    const edges = buildContainmentEdges(new Set(), []);
    expect(edges).toEqual([]);
  });

  it('handles deeply nested folder hierarchy', () => {
    const folderPaths = new Set(['a', 'a/b', 'a/b/c']);
    const nodes = [{ id: 'a/b/c/file.ts', label: 'file.ts', color: '#fff' }];

    const edges = buildContainmentEdges(folderPaths, nodes);

    expect(edges.find(e => e.from === 'a' && e.to === 'a/b')).toBeDefined();
    expect(edges.find(e => e.from === 'a/b' && e.to === 'a/b/c')).toBeDefined();
    expect(edges.find(e => e.from === 'a/b/c' && e.to === 'a/b/c/file.ts')).toBeDefined();
  });

  it('creates edges for multiple files in the same folder', () => {
    const folderPaths = new Set(['src']);
    const nodes = [
      { id: 'src/a.ts', label: 'a.ts', color: '#fff' },
      { id: 'src/b.ts', label: 'b.ts', color: '#fff' },
    ];

    const edges = buildContainmentEdges(folderPaths, nodes);

    expect(edges.filter(e => e.from === 'src')).toHaveLength(2);
  });

  it('creates correct edge IDs in parent->child format', () => {
    const folderPaths = new Set(['src']);
    const nodes = [{ id: 'src/main.ts', label: 'main.ts', color: '#fff' }];

    const edges = buildContainmentEdges(folderPaths, nodes);

    const fileEdge = edges.find(e => e.to === 'src/main.ts');
    expect(fileEdge!.id).toBe('src->src/main.ts');
  });

  it('handles root-level files identified by single segment IDs', () => {
    const folderPaths = new Set<string>();
    const nodes = [
      { id: 'README.md', label: 'README.md', color: '#fff' },
    ];

    const edges = buildContainmentEdges(folderPaths, nodes);

    expect(edges).toHaveLength(1);
    expect(edges[0].from).toBe('(root)');
    expect(edges[0].to).toBe('README.md');
  });
});
