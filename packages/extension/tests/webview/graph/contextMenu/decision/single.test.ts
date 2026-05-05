import { describe, expect, it } from 'vitest';
import { classifySingleNodeDecision } from '../../../../../src/webview/components/graph/contextMenu/decision/single';

describe('graph/contextMenu/decision/single', () => {
  it('maps classified node targets to single-node decisions', () => {
    expect(classifySingleNodeDecision({
      id: 'src/app.ts',
      nodeKind: 'file',
      nodeType: 'file',
    })).toMatchObject({ kind: 'singleFileNode' });
    expect(classifySingleNodeDecision({
      id: 'src',
      nodeKind: 'folder',
      nodeType: 'folder',
    })).toMatchObject({ kind: 'singleFolderNode' });
    expect(classifySingleNodeDecision({
      id: 'pkg:react',
      nodeKind: 'package',
      nodeType: 'package',
    })).toMatchObject({ kind: 'singlePackageNode' });
    expect(classifySingleNodeDecision({
      id: 'route:/home',
      nodeKind: 'plugin',
      nodeType: 'route',
    })).toMatchObject({ kind: 'singlePluginNode' });
  });
});
