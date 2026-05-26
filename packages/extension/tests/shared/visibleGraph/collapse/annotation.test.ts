import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphNode } from '../../../../src/shared/graph/contracts';
import {
  annotateCollapsibleFolders,
  annotateFolderNode,
  countCollapsedDescendants,
} from '../../../../src/shared/visibleGraph/collapse/annotation';

function node(id: string, nodeType = 'file'): IGraphNode {
  return {
    id,
    label: id,
    color: '#111111',
    nodeType,
  };
}

describe('shared/visibleGraph/collapse/annotation', () => {
  it('leaves non-folder nodes unchanged', () => {
    const file = node('src/app.ts');

    expect(annotateFolderNode(file, new Set(['src']), [file], new Set(), new Map())).toBe(file);
  });

  it('marks folders as collapsible when they have descendants', () => {
    const folder = node('src', 'folder');
    const result = annotateFolderNode(folder, new Set(['src']), [
      folder,
      node('src/app.ts'),
    ], new Set(), new Map());

    expect(result).toMatchObject({
      id: 'src',
      isCollapsible: true,
      isCollapsed: false,
    });
    expect(result).not.toHaveProperty('collapsedDescendantCount');
  });

  it('marks folders without descendants as non-collapsible', () => {
    const folder = node('src', 'folder');

    expect(annotateFolderNode(folder, new Set(['src']), [folder], new Set(), new Map())).toMatchObject({
      isCollapsible: false,
      isCollapsed: false,
    });
  });

  it('counts only descendants hidden by the collapsed folder', () => {
    const folder = node('src', 'folder');
    const hiddenByNodeId = new Map([
      ['src/app.ts', 'src'],
      ['src/lib.ts', 'src'],
      ['other.ts', 'lib'],
    ]);

    expect(countCollapsedDescendants('src', hiddenByNodeId)).toBe(2);
    expect(annotateFolderNode(folder, new Set(['src']), [
      folder,
      node('src/app.ts'),
    ], new Set(['src']), hiddenByNodeId)).toMatchObject({
      isCollapsed: true,
      collapsedDescendantCount: 2,
    });
  });

  it('annotates every folder while preserving the edge list', () => {
    const edges: IGraphData['edges'] = [];
    const graphData: IGraphData = {
      nodes: [node('src', 'folder'), node('src/app.ts')],
      edges,
    };

    const result = annotateCollapsibleFolders(graphData, new Set(['src']));

    expect(result.edges).toBe(edges);
    expect(result.nodes[0]).toMatchObject({ id: 'src', isCollapsible: true });
    expect(result.nodes[1]).toBe(graphData.nodes[1]);
  });
});
