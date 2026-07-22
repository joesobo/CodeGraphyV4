import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphNode } from '../../src/graph/contracts';
import { applyStructuralProjection } from '../../src/visibleGraph/structure';
import {
  buildContainmentEdges,
  buildProjectedStructuralEdges,
  buildWorkspacePackageEdges,
  createStructuralEdge,
} from '../../src/visibleGraph/structuralProjection/edges';
import {
  collectVisibleFolderNodeIds,
  isFolderNode,
  projectFolders,
} from '../../src/visibleGraph/structuralProjection/folders';
import {
  hasStructuralNodeProjection,
  resolveStructuralProjectionOptions,
} from '../../src/visibleGraph/structuralProjection/options';
import { projectWorkspacePackages } from '../../src/visibleGraph/structuralProjection/packages';

function node(id: string, nodeType: IGraphNode['nodeType'] = 'file'): IGraphNode {
  return {
    id,
    label: id,
    color: '#111111',
    nodeType,
  };
}

describe('visibleGraph structural projection', () => {
  it('creates deterministic structural containment edges', () => {
    expect(createStructuralEdge('src', 'src/app.ts')).toEqual({
      id: 'src->src/app.ts#nests',
      from: 'src',
      to: 'src/app.ts',
      kind: 'nests',
      sources: [],
    });
    expect(buildContainmentEdges(
      new Set(['(root)', 'src', 'src/domain']),
      [
        node('package.json'),
        node('src/domain/model.ts'),
      ],
    )).toEqual([
      createStructuralEdge('(root)', 'src'),
      createStructuralEdge('src', 'src/domain'),
      createStructuralEdge('(root)', 'package.json'),
      createStructuralEdge('src/domain', 'src/domain/model.ts'),
    ]);
  });

  it('connects file nodes to their nearest workspace package roots', () => {
    expect(buildWorkspacePackageEdges(
      new Set(['.', 'packages/core']),
      [
        node('package.json'),
        node('packages/core/src/index.ts'),
        node('docs', 'folder'),
        node('elsewhere/app.ts'),
      ],
    )).toEqual([
      {
        id: 'pkg:workspace:.->package.json#nests',
        from: 'pkg:workspace:.',
        to: 'package.json',
        kind: 'nests',
        sources: [],
      },
      {
        id: 'pkg:workspace:packages/core->packages/core/src/index.ts#nests',
        from: 'pkg:workspace:packages/core',
        to: 'packages/core/src/index.ts',
        kind: 'nests',
        sources: [],
      },
      {
        id: 'pkg:workspace:.->elsewhere/app.ts#nests',
        from: 'pkg:workspace:.',
        to: 'elsewhere/app.ts',
        kind: 'nests',
        sources: [],
      },
    ]);
    expect(buildWorkspacePackageEdges(
      new Set(['packages/core']),
      [node('src/app.ts')],
    )).toEqual([]);
  });

  it('returns no structural edges when nesting projection is disabled', () => {
    expect(buildProjectedStructuralEdges(
      { nestsEnabled: false, folderEnabled: true, packageEnabled: true },
      new Set(['src']),
      new Set(['.']),
      [node('src/app.ts')],
    )).toEqual([]);
  });

  it('builds enabled folder and package structural edges', () => {
    expect(buildProjectedStructuralEdges(
      { nestsEnabled: true, folderEnabled: true, packageEnabled: true },
      new Set(['src']),
      new Set(['.']),
      [node('src/app.ts')],
    )).toEqual([
      createStructuralEdge('(root)', 'src'),
      createStructuralEdge('src', 'src/app.ts'),
      createStructuralEdge('pkg:workspace:.', 'src/app.ts'),
    ]);
    expect(buildProjectedStructuralEdges(
      { nestsEnabled: true, folderEnabled: false, packageEnabled: false },
      new Set(['src']),
      new Set(['.']),
      [node('src/app.ts')],
    )).toEqual([]);
  });

  it('projects missing folder nodes while preserving visible folders', () => {
    const sourceFolder = node('src', 'folder');
    const projection = projectFolders(
      true,
      [node('src/domain/model.ts'), node('package.json')],
      [sourceFolder],
      new Set(['src']),
    );

    expect(isFolderNode(sourceFolder)).toBe(true);
    expect(collectVisibleFolderNodeIds([sourceFolder, node('src/app.ts')])).toEqual(new Set(['src']));
    expect(projection.paths).toEqual(new Set(['src', 'src/domain', '(root)']));
    expect(projection.nodes.map((candidate) => candidate.id)).toEqual([
      'src/domain',
      '(root)',
    ]);
    expect(projectFolders(false, [node('src/app.ts')], [], new Set())).toEqual({
      paths: new Set(),
      nodes: [],
    });
  });

  it('projects workspace package nodes from package manifests', () => {
    expect(projectWorkspacePackages(false, [node('package.json')])).toEqual({
      roots: new Set(),
      nodes: [],
    });

    expect(projectWorkspacePackages(true, [
      node('package.json'),
      node('packages/core/package.json'),
      node('packages/core/src/index.ts'),
    ])).toEqual({
      roots: new Set(['.', 'packages/core']),
      nodes: [
        {
          id: 'pkg:workspace:.',
          label: 'workspace',
          color: '',
          nodeType: 'package',
          shape2D: 'hexagon',
        },
        {
          id: 'pkg:workspace:packages/core',
          label: 'core',
          color: '',
          nodeType: 'package',
          shape2D: 'hexagon',
        },
      ],
    });
  });

  it('resolves structural projection options from scope items', () => {
    expect(resolveStructuralProjectionOptions()).toEqual({
      folderEnabled: false,
      packageEnabled: false,
      nestsEnabled: true,
    });
    expect(resolveStructuralProjectionOptions({
      nodes: [
        { type: 'folder', enabled: true },
        { type: 'package', enabled: true },
      ],
      edges: [
        { type: 'nests', enabled: false },
      ],
    })).toEqual({
      folderEnabled: true,
      packageEnabled: true,
      nestsEnabled: false,
    });
    expect(hasStructuralNodeProjection({ folderEnabled: false, packageEnabled: false, nestsEnabled: true })).toBe(false);
    expect(hasStructuralNodeProjection({ folderEnabled: false, packageEnabled: true, nestsEnabled: true })).toBe(true);
  });

  it('returns the original graph without structural node projection', () => {
    const graphData: IGraphData = {
      nodes: [node('src/app.ts')],
      edges: [],
    };

    expect(applyStructuralProjection(graphData)).toBe(graphData);
  });

  it('adds projected folders and package nodes around the visible graph', () => {
    const visibleGraphData: IGraphData = {
      nodes: [
        node('src/app.ts'),
      ],
      edges: [],
    };
    const sourceGraphData: IGraphData = {
      nodes: [
        node('package.json'),
        node('src/app.ts'),
        node('src/hidden.ts'),
        node('packages/core/package.json'),
      ],
      edges: [],
    };

    expect(applyStructuralProjection(
      visibleGraphData,
      {
        nodes: [
          { type: 'folder', enabled: true },
          { type: 'package', enabled: true },
        ],
        edges: [
          { type: 'nests', enabled: true },
        ],
      },
      sourceGraphData,
    )).toEqual({
      nodes: [
        node('src/app.ts'),
        {
          id: 'src',
          label: 'src',
          color: '',
          nodeType: 'folder',
        },
        {
          id: 'packages',
          label: 'packages',
          color: '',
          nodeType: 'folder',
        },
        {
          id: 'packages/core',
          label: 'core',
          color: '',
          nodeType: 'folder',
        },
        {
          id: '(root)',
          label: '(root)',
          color: '',
          nodeType: 'folder',
        },
        {
          id: 'pkg:workspace:.',
          label: 'workspace',
          color: '',
          nodeType: 'package',
          shape2D: 'hexagon',
        },
        {
          id: 'pkg:workspace:packages/core',
          label: 'core',
          color: '',
          nodeType: 'package',
          shape2D: 'hexagon',
        },
      ],
      edges: [
        createStructuralEdge('(root)', 'src'),
        createStructuralEdge('(root)', 'packages'),
        createStructuralEdge('packages', 'packages/core'),
        createStructuralEdge('src', 'src/app.ts'),
        createStructuralEdge('pkg:workspace:.', 'src/app.ts'),
      ],
    });
  });
});
