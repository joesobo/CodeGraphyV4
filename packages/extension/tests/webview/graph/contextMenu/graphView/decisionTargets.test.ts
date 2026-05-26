import { describe, expect, it } from 'vitest';
import type { GraphContextMenuDecision } from '../../../../../src/webview/components/graph/contextMenu/decision/model';
import {
  getNodeTargets,
  getSingleNodeTarget,
} from '../../../../../src/webview/components/graph/contextMenu/graphView/decisionTargets';
import type { GraphContextNodeTarget } from '../../../../../src/webview/components/graph/contextMenu/decision/targets';

describe('graphView decision targets', () => {
  it('returns the single node target only for single-node decisions', () => {
    const target = createTarget('src/app.ts');

    expect(getSingleNodeTarget({ kind: 'singleFileNode', target })).toBe(target);
    expect(getSingleNodeTarget({ kind: 'background' })).toBeUndefined();
    expect(getSingleNodeTarget({
      kind: 'multiFileNodes',
      targets: [target],
    })).toBeUndefined();
  });

  it('returns node target lists for single and multi node decisions', () => {
    const first = createTarget('src/app.ts');
    const second = createTarget('src/util.ts');

    expect(getNodeTargets({ kind: 'singleFileNode', target: first })).toEqual([first]);
    expect(getNodeTargets({
      kind: 'multiFileNodes',
      targets: [first, second],
    })).toEqual([first, second]);
  });

  it('returns no node targets for background, empty, and edge decisions', () => {
    const decisions: GraphContextMenuDecision[] = [
      { kind: 'background' },
      { kind: 'emptyNodeSelection' },
      { kind: 'edge', edgeId: 'a->b#import', targets: ['a', 'b'] },
    ];

    expect(decisions.map(getNodeTargets)).toEqual([[], [], []]);
  });
});

function createTarget(id: string): GraphContextNodeTarget {
  return { id, nodeKind: 'file', nodeType: 'file' };
}
