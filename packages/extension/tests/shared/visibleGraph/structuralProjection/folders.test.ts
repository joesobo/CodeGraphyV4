import { describe, expect, it } from 'vitest';
import type { IGraphNode } from '../../../../src/shared/graph/contracts';
import {
  collectVisibleFolderNodeIds,
  isFolderNode,
  projectFolders,
} from '../../../../src/shared/visibleGraph/structuralProjection/folders';

function node(id: string, nodeType = 'file'): IGraphNode {
  return {
    id,
    label: id.split('/').pop() ?? id,
    color: '#111111',
    nodeType,
  };
}

describe('shared/visibleGraph/structuralProjection/folders', () => {
  it('recognizes only folder nodes', () => {
    expect(isFolderNode(node('src', 'folder'))).toBe(true);
    expect(isFolderNode(node('src/app.ts'))).toBe(false);
  });

  it('collects visible folder ids without file ids', () => {
    const visibleIds = collectVisibleFolderNodeIds([
      node('src', 'folder'),
      node('src/app.ts'),
    ]);

    expect(Array.from(visibleIds)).toEqual(['src']);
  });

  it('returns empty folder projection when folder projection is disabled', () => {
    const projection = projectFolders(false, [node('src/app.ts')], [], new Set());

    expect(projection.nodes).toEqual([]);
    expect(Array.from(projection.paths)).toEqual([]);
  });

  it('projects missing folder nodes from source file paths', () => {
    const projection = projectFolders(
      true,
      [node('src/features/app.ts')],
      [],
      new Set(['src']),
    );

    expect(projection.nodes).toEqual([
      {
        id: 'src/features',
        label: 'features',
        color: '',
        nodeType: 'folder',
      },
    ]);
    expect(Array.from(projection.paths)).toEqual(['src', 'src/features']);
  });

  it('projects discovered folder ancestors even when the folder is empty', () => {
    const projection = projectFolders(
      true,
      [],
      [node('src/generated/cache', 'folder')],
      new Set(),
    );

    expect(projection.nodes.map((item) => item.id)).toEqual([
      'src',
      'src/generated',
      'src/generated/cache',
    ]);
  });
});
