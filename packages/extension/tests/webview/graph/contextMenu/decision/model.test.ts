import { describe, expect, it } from 'vitest';
import { decideGraphContextMenu } from '../../../../../src/webview/components/graph/contextMenu/decision/model';
import type { GraphContextMenuNode } from '../../../../../src/webview/components/graph/contextMenu/contracts';

const nodes: GraphContextMenuNode[] = [
  { id: 'src/app.ts', nodeType: 'file' },
  { id: 'src', nodeType: 'folder' },
  { id: 'pkg:react', nodeType: 'package' },
  { id: 'route:/home', nodeType: 'route' },
];

describe('graph/contextMenu/decision/model', () => {
  it('classifies background and edge context selections', () => {
    expect(decideGraphContextMenu({ kind: 'background', targets: [] }, nodes)).toEqual({
      kind: 'background',
    });

    expect(decideGraphContextMenu({
      kind: 'edge',
      edgeId: 'src/app.ts->src/index.ts',
      targets: ['src/app.ts', 'src/index.ts'],
    }, nodes)).toEqual({
      kind: 'edge',
      edgeId: 'src/app.ts->src/index.ts',
      targets: ['src/app.ts', 'src/index.ts'],
    });
  });

  it('classifies single node selections by node kind', () => {
    expect(decideGraphContextMenu({ kind: 'node', targets: ['src/app.ts'] }, nodes)).toMatchObject({
      kind: 'singleFileNode',
      target: { id: 'src/app.ts', nodeKind: 'file', nodeType: 'file' },
    });

    expect(decideGraphContextMenu({ kind: 'node', targets: ['src'] }, nodes)).toMatchObject({
      kind: 'singleFolderNode',
      target: { id: 'src', nodeKind: 'folder', nodeType: 'folder' },
    });

    expect(decideGraphContextMenu({ kind: 'node', targets: ['pkg:react'] }, nodes)).toMatchObject({
      kind: 'singlePackageNode',
      target: { id: 'pkg:react', nodeKind: 'package', nodeType: 'package' },
    });

    expect(decideGraphContextMenu({ kind: 'node', targets: ['route:/home'] }, nodes)).toMatchObject({
      kind: 'singlePluginNode',
      target: { id: 'route:/home', nodeKind: 'plugin', nodeType: 'route' },
    });
  });

  it('treats missing node metadata as a File Node and package ids as Package nodes', () => {
    expect(decideGraphContextMenu({ kind: 'node', targets: ['src/missing.ts'] }, nodes)).toMatchObject({
      kind: 'singleFileNode',
      target: { id: 'src/missing.ts', nodeKind: 'file', nodeType: 'file' },
    });

    expect(decideGraphContextMenu({ kind: 'node', targets: ['pkg:unknown'] }, nodes)).toMatchObject({
      kind: 'singlePackageNode',
      target: { id: 'pkg:unknown', nodeKind: 'package', nodeType: 'package' },
    });
  });

  it('classifies homogeneous multi-node selections', () => {
    expect(decideGraphContextMenu({
      kind: 'node',
      targets: ['src/app.ts', 'src/index.ts'],
    }, nodes)).toMatchObject({
      kind: 'multiFileNodes',
      targets: [
        { id: 'src/app.ts', nodeKind: 'file' },
        { id: 'src/index.ts', nodeKind: 'file' },
      ],
    });

    expect(decideGraphContextMenu({
      kind: 'node',
      targets: ['src', 'tests'],
    }, [
      ...nodes,
      { id: 'tests', nodeType: 'folder' },
    ])).toMatchObject({
      kind: 'multiFolderNodes',
      targets: [
        { id: 'src', nodeKind: 'folder' },
        { id: 'tests', nodeKind: 'folder' },
      ],
    });

    expect(decideGraphContextMenu({
      kind: 'node',
      targets: ['pkg:react', 'pkg:vscode'],
    }, nodes)).toMatchObject({
      kind: 'multiPackageNodes',
      targets: [
        { id: 'pkg:react', nodeKind: 'package' },
        { id: 'pkg:vscode', nodeKind: 'package' },
      ],
    });
  });

  it('classifies empty and mixed node selections explicitly', () => {
    expect(decideGraphContextMenu({ kind: 'node', targets: [] }, nodes)).toEqual({
      kind: 'emptyNodeSelection',
    });

    expect(decideGraphContextMenu({
      kind: 'node',
      targets: ['src/app.ts', 'src', 'route:/home'],
    }, nodes)).toMatchObject({
      kind: 'mixedNodeSelection',
      targets: [
        { id: 'src/app.ts', nodeKind: 'file' },
        { id: 'src', nodeKind: 'folder' },
        { id: 'route:/home', nodeKind: 'plugin' },
      ],
    });
  });
});
