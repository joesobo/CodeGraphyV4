import { describe, expect, it } from 'vitest';
import type { IGraphNode } from '../../src/graph/contracts';
import { createWorkspacePackageNodes } from '../../src/graphControls/packages/nodes';
import {
  collectWorkspacePackageRoots,
  getNearestWorkspacePackageRoot,
} from '../../src/graphControls/packages/roots';

function fileNode(id: string): IGraphNode {
  return {
    id,
    label: id,
    color: '#111111',
    nodeType: 'file',
  };
}

describe('graphControls/packages', () => {
  it('collects package roots from file package manifests only', () => {
    expect([...collectWorkspacePackageRoots([
      fileNode('package.json'),
      fileNode('packages/core/package.json'),
      { ...fileNode('packages/core/src/index.ts') },
      { ...fileNode('packages/not-file/package.json'), nodeType: 'folder' },
    ])]).toEqual(['.', 'packages/core']);
  });

  it('chooses the nearest package root for nested file paths', () => {
    const roots = new Set(['.', 'packages/core', 'packages/core/src/feature']);

    expect(getNearestWorkspacePackageRoot('packages/core/src/feature/model.ts', roots)).toBe('packages/core/src/feature');
    expect(getNearestWorkspacePackageRoot('packages/core/src/index.ts', roots)).toBe('packages/core');
    expect(getNearestWorkspacePackageRoot('README.md', roots)).toBe('.');
    expect(getNearestWorkspacePackageRoot('elsewhere/file.ts', new Set(['packages/core']))).toBeNull();
  });

  it('creates deterministic workspace package nodes with readable labels', () => {
    expect(createWorkspacePackageNodes(new Set(['packages/core', '.', 'packages/mcp']), '#abcdef')).toEqual([
      {
        id: 'pkg:workspace:.',
        label: 'workspace',
        color: '#abcdef',
        nodeType: 'package',
        shape2D: 'hexagon',
      },
      {
        id: 'pkg:workspace:packages/core',
        label: 'core',
        color: '#abcdef',
        nodeType: 'package',
        shape2D: 'hexagon',
      },
      {
        id: 'pkg:workspace:packages/mcp',
        label: 'mcp',
        color: '#abcdef',
        nodeType: 'package',
        shape2D: 'hexagon',
      },
    ]);
  });
});
