import { describe, expect, it } from 'vitest';
import {
  buildStructuralEdges,
  buildStructuralGraphNodes,
} from '../../../../src/webview/graphControls/filtering/structures';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../../../src/shared/graphControls/defaults/definitions';
import {
  DEFAULT_FOLDER_NODE_COLOR,
  DEFAULT_PACKAGE_NODE_COLOR,
} from '../../../../src/shared/fileColors';
import { WORKSPACE_PACKAGE_NODE_ID_PREFIX } from '../../../../src/shared/graphControls/packages/workspace';

const fileNodes = [
  { id: 'package.json', label: 'package.json', color: '#111111', nodeType: 'file' as const },
  {
    id: 'packages/extension/src/index.ts',
    label: 'index.ts',
    color: '#222222',
    nodeType: 'file' as const,
  },
  {
    id: 'packages/plugin-api/src/api.ts',
    label: 'api.ts',
    color: '#333333',
    nodeType: 'file' as const,
  },
];

describe('webview/graphControls/filtering/structures', () => {
  it('builds folder and package nodes with default colors when overrides are missing', () => {
    const result = buildStructuralGraphNodes(
      fileNodes,
      { folder: true, package: true },
      {},
    );

    expect(result.folderPaths).toEqual(
      new Set(['(root)', 'packages', 'packages/extension', 'packages/extension/src', 'packages/plugin-api', 'packages/plugin-api/src']),
    );
    expect(result.workspacePackageRoots).toEqual(new Set(['.']));
    expect(result.folderNodes).toEqual([
      { id: 'packages', label: 'packages', color: DEFAULT_FOLDER_NODE_COLOR, nodeType: 'folder' },
      {
        id: 'packages/extension',
        label: 'extension',
        color: DEFAULT_FOLDER_NODE_COLOR,
        nodeType: 'folder',
      },
      {
        id: 'packages/extension/src',
        label: 'src',
        color: DEFAULT_FOLDER_NODE_COLOR,
        nodeType: 'folder',
      },
      {
        id: 'packages/plugin-api',
        label: 'plugin-api',
        color: DEFAULT_FOLDER_NODE_COLOR,
        nodeType: 'folder',
      },
      {
        id: 'packages/plugin-api/src',
        label: 'src',
        color: DEFAULT_FOLDER_NODE_COLOR,
        nodeType: 'folder',
      },
      { id: '(root)', label: '(root)', color: DEFAULT_FOLDER_NODE_COLOR, nodeType: 'folder' },
    ]);
    expect(result.packageNodes).toEqual([
      {
        id: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}.`,
        label: 'workspace',
        color: DEFAULT_PACKAGE_NODE_COLOR,
        nodeType: 'package',
        shape2D: 'hexagon',
        shape3D: 'cube',
      },
    ]);
  });

  it('skips folder and package structures when those node types are hidden', () => {
    expect(
      buildStructuralGraphNodes(
        fileNodes,
        { folder: false, package: false },
        { folder: '#abcdef', package: '#fedcba' },
      ),
    ).toEqual({
      folderPaths: new Set<string>(),
      folderNodes: [],
      packageNodes: [],
      workspacePackageRoots: new Set<string>(),
    });
  });

  it('treats missing folder and package visibility flags as disabled', () => {
    expect(buildStructuralGraphNodes(fileNodes, {}, {})).toEqual({
      folderPaths: new Set<string>(),
      folderNodes: [],
      packageNodes: [],
      workspacePackageRoots: new Set<string>(),
    });

    expect(
      buildStructuralEdges(
        fileNodes,
        {},
        {},
        new Set(['(root)', 'packages']),
        new Set(['.']),
      ),
    ).toEqual([]);
  });

  it('suppresses all structural edges when the nests edge kind is hidden', () => {
    const { folderPaths, workspacePackageRoots } = buildStructuralGraphNodes(
      fileNodes,
      { folder: true, package: true },
      {},
    );

    expect(
      buildStructuralEdges(
        fileNodes,
        { folder: true, package: true },
        { [STRUCTURAL_NESTS_EDGE_KIND]: false },
        folderPaths,
        workspacePackageRoots,
      ),
    ).toEqual([]);
  });

  it('builds only the enabled folder or package structural edges', () => {
    const structures = buildStructuralGraphNodes(
      fileNodes,
      { folder: true, package: true },
      {},
    );

    const folderOnly = buildStructuralEdges(
      fileNodes,
      { folder: true, package: false },
      {},
      structures.folderPaths,
      structures.workspacePackageRoots,
    );
    const packageOnly = buildStructuralEdges(
      fileNodes,
      { folder: false, package: true },
      {},
      structures.folderPaths,
      structures.workspacePackageRoots,
    );

    expect(folderOnly.every(edge => edge.kind === STRUCTURAL_NESTS_EDGE_KIND)).toBe(true);
    expect(folderOnly.some(edge => edge.from === '(root)' && edge.to === 'package.json')).toBe(true);
    expect(folderOnly.some(edge => edge.from === 'packages/extension/src' && edge.to === 'packages/extension/src/index.ts')).toBe(true);
    expect(folderOnly.some(edge => edge.from.startsWith(WORKSPACE_PACKAGE_NODE_ID_PREFIX))).toBe(false);

    expect(packageOnly.every(edge => edge.kind === STRUCTURAL_NESTS_EDGE_KIND)).toBe(true);
    expect(packageOnly.some(edge => edge.from === `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}.` && edge.to === 'package.json')).toBe(true);
    expect(packageOnly.some(edge => edge.from === `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}.` && edge.to === 'packages/extension/src/index.ts')).toBe(true);
    expect(packageOnly.some(edge => edge.from === '(root)' || edge.from === 'packages')).toBe(false);
  });
});
