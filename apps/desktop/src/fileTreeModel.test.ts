import { describe, expect, it } from 'vitest';
import type { FileTreeEntry } from './model';
import { filterFileTree, flattenVisibleFileTree } from './fileTreeModel';

const entries: FileTreeEntry[] = [
  {
    kind: 'folder',
    name: 'src',
    path: 'src',
    children: [
      { kind: 'file', name: 'main.ts', path: 'src/main.ts' },
      {
        kind: 'folder',
        name: 'graph',
        path: 'src/graph',
        children: [{ kind: 'file', name: 'camera.ts', path: 'src/graph/camera.ts' }],
      },
    ],
  },
  { kind: 'file', name: 'package.json', path: 'package.json' },
];

describe('File hierarchy model', () => {
  it('filters by relative path while keeping matching ancestors', () => {
    expect(filterFileTree(entries, 'graph/cam')).toEqual([{
      kind: 'folder',
      name: 'src',
      path: 'src',
      children: [{
        kind: 'folder',
        name: 'graph',
        path: 'src/graph',
        children: [{ kind: 'file', name: 'camera.ts', path: 'src/graph/camera.ts' }],
      }],
    }]);
  });

  it('flattens only expanded hierarchy rows in keyboard order', () => {
    expect(flattenVisibleFileTree(entries, new Set(['src']), false).map(row => [
      row.entry.path,
      row.parentPath,
    ])).toEqual([
      ['src', undefined],
      ['src/main.ts', 'src'],
      ['src/graph', 'src'],
      ['package.json', undefined],
    ]);
  });

  it('forces matching result ancestors open without mutating collapse state', () => {
    const filtered = filterFileTree(entries, 'camera');
    expect(flattenVisibleFileTree(filtered, new Set(), true).map(row => row.entry.path)).toEqual([
      'src',
      'src/graph',
      'src/graph/camera.ts',
    ]);
  });
});
