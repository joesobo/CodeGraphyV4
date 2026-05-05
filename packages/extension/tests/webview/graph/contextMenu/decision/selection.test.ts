import { describe, expect, it } from 'vitest';
import { decideNodeGraphContextMenu } from '../../../../../src/webview/components/graph/contextMenu/decision/selection';

describe('graph/contextMenu/decision/selection', () => {
  it('classifies empty and single node selections', () => {
    expect(decideNodeGraphContextMenu([])).toEqual({ kind: 'emptyNodeSelection' });
    expect(decideNodeGraphContextMenu(['src/app.ts'])).toMatchObject({
      kind: 'singleFileNode',
      target: { id: 'src/app.ts', nodeKind: 'file', nodeType: 'file' },
    });
  });

  it('classifies homogeneous multi-node selections', () => {
    expect(decideNodeGraphContextMenu(['a.ts', 'b.ts'])).toMatchObject({
      kind: 'multiFileNodes',
    });
    expect(decideNodeGraphContextMenu(['src', 'tests'], [
      { id: 'src', nodeType: 'folder' },
      { id: 'tests', nodeType: 'folder' },
    ])).toMatchObject({
      kind: 'multiFolderNodes',
    });
    expect(decideNodeGraphContextMenu(['pkg:react', 'pkg:vscode'])).toMatchObject({
      kind: 'multiPackageNodes',
    });
  });

  it('classifies mixed node selections', () => {
    expect(decideNodeGraphContextMenu(['src/app.ts', 'src'], [
      { id: 'src/app.ts', nodeType: 'file' },
      { id: 'src', nodeType: 'folder' },
    ])).toMatchObject({
      kind: 'mixedNodeSelection',
    });
  });
});
