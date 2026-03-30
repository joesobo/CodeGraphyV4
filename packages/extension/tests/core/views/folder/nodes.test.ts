import { describe, it, expect } from 'vitest';
import { collectFolderPaths, createFolderNodes } from '../../../../src/core/views/folder/nodes';

describe('collectFolderPaths', () => {
  it('returns empty set and hasRootFiles false for empty nodes', () => {
    const result = collectFolderPaths([]);

    expect(result.paths.size).toBe(0);
    expect(result.hasRootFiles).toBe(false);
  });

  it('extracts parent folder from file with one directory level', () => {
    const result = collectFolderPaths([
      { id: 'src/app.ts', label: 'app.ts', color: '#fff' },
    ]);

    expect(result.paths.has('src')).toBe(true);
    expect(result.paths.size).toBe(1);
  });

  it('extracts all ancestor folders for deeply nested files', () => {
    const result = collectFolderPaths([
      { id: 'a/b/c/file.ts', label: 'file.ts', color: '#fff' },
    ]);

    expect(result.paths.has('a')).toBe(true);
    expect(result.paths.has('a/b')).toBe(true);
    expect(result.paths.has('a/b/c')).toBe(true);
    expect(result.paths.size).toBe(3);
  });

  it('deduplicates shared ancestor folders across multiple files', () => {
    const result = collectFolderPaths([
      { id: 'src/a.ts', label: 'a.ts', color: '#fff' },
      { id: 'src/b.ts', label: 'b.ts', color: '#fff' },
    ]);

    expect(result.paths.has('src')).toBe(true);
    expect(result.paths.size).toBe(1);
  });

  it('adds (root) when root-level files exist', () => {
    const result = collectFolderPaths([
      { id: 'index.ts', label: 'index.ts', color: '#fff' },
    ]);

    expect(result.paths.has('(root)')).toBe(true);
    expect(result.hasRootFiles).toBe(true);
  });

  it('does not add (root) when all files are in subdirectories', () => {
    const result = collectFolderPaths([
      { id: 'src/app.ts', label: 'app.ts', color: '#fff' },
    ]);

    expect(result.paths.has('(root)')).toBe(false);
    expect(result.hasRootFiles).toBe(false);
  });

  it('handles a mix of root-level and nested files', () => {
    const result = collectFolderPaths([
      { id: 'index.ts', label: 'index.ts', color: '#fff' },
      { id: 'src/app.ts', label: 'app.ts', color: '#fff' },
    ]);

    expect(result.paths.has('(root)')).toBe(true);
    expect(result.paths.has('src')).toBe(true);
    expect(result.hasRootFiles).toBe(true);
  });

  it('identifies root files by absence of slash in ID', () => {
    const result = collectFolderPaths([
      { id: 'fileWithoutPath', label: 'fileWithoutPath', color: '#fff' },
    ]);

    expect(result.hasRootFiles).toBe(true);
    expect(result.paths.has('(root)')).toBe(true);
  });

  it('does not create folder path for a single-segment file id', () => {
    const result = collectFolderPaths([
      { id: 'index.ts', label: 'index.ts', color: '#fff' },
    ]);

    // The only path should be (root), not an empty string
    expect(result.paths.has('')).toBe(false);
    const pathsWithoutRoot = Array.from(result.paths).filter(path => path !== '(root)');
    expect(pathsWithoutRoot).toHaveLength(0);
  });

  it('creates exactly one folder for a file one level deep', () => {
    const result = collectFolderPaths([
      { id: 'src/app.ts', label: 'app.ts', color: '#fff' },
    ]);

    expect(result.paths.has('src')).toBe(true);
    expect(result.paths.has('(root)')).toBe(false);
    expect(result.paths.size).toBe(1);
  });
});

describe('createFolderNodes', () => {
  it('creates a folder node for each path in the set', () => {
    const paths = new Set(['src', 'lib']);

    const nodes = createFolderNodes(paths, '#FF0000');

    expect(nodes).toHaveLength(2);
    expect(nodes.map(n => n.id).sort()).toEqual(['lib', 'src']);
  });

  it('uses the last path segment as the label for nested folders', () => {
    const paths = new Set(['src/components/ui']);

    const nodes = createFolderNodes(paths, '#FF0000');

    expect(nodes[0].label).toBe('ui');
  });

  it('uses (root) as label for the root folder path', () => {
    const paths = new Set(['(root)']);

    const nodes = createFolderNodes(paths, '#FF0000');

    expect(nodes[0].label).toBe('(root)');
  });

  it('applies the specified color to all folder nodes', () => {
    const paths = new Set(['src', 'lib', '(root)']);

    const nodes = createFolderNodes(paths, '#00FF00');

    for (const node of nodes) {
      expect(node.color).toBe('#00FF00');
    }
  });

  it('sets nodeType to folder for all nodes', () => {
    const paths = new Set(['src', 'lib']);

    const nodes = createFolderNodes(paths, '#FF0000');

    for (const node of nodes) {
      expect(node.nodeType).toBe('folder');
    }
  });

  it('returns an empty array for an empty set', () => {
    const nodes = createFolderNodes(new Set(), '#FF0000');

    expect(nodes).toEqual([]);
  });

  it('uses the top-level name as label for single-segment paths', () => {
    const paths = new Set(['src']);

    const nodes = createFolderNodes(paths, '#FF0000');

    expect(nodes[0].label).toBe('src');
  });

  it('uses (root) as label when path is (root) via split/pop', () => {
    const paths = new Set(['(root)', 'src']);

    const nodes = createFolderNodes(paths, '#FF0000');

    const rootNode = nodes.find(n => n.id === '(root)');
    const srcNode = nodes.find(n => n.id === 'src');

    expect(rootNode).toBeDefined();
    expect(rootNode!.label).toBe('(root)');
    expect(srcNode).toBeDefined();
    expect(srcNode!.label).toBe('src');
  });

  it('uses the last segment for nested folder path labels', () => {
    const paths = new Set(['a/b/c']);

    const nodes = createFolderNodes(paths, '#FF0000');

    expect(nodes[0].label).toBe('c');
    expect(nodes[0].label).not.toBe('a/b/c');
  });
});
