import { describe, expect, it } from 'vitest';
import { buildBranchLaneLayout } from '../../../../../src/webview/components/timeline/branchGraph/layout';

const commitsNewestFirst = [
  {
    author: 'Dana',
    message: 'Merge feature branch',
    parents: [
      'bbb222bbb222bbb222bbb222bbb222bbb222bbb2',
      'ccc333ccc333ccc333ccc333ccc333ccc333ccc3',
    ],
    sha: 'ddd444ddd444ddd444ddd444ddd444ddd444ddd4',
    timestamp: 1709467200,
  },
  {
    author: 'Bob',
    message: 'Mainline change',
    parents: ['aaa111aaa111aaa111aaa111aaa111aaa111aaa1'],
    sha: 'bbb222bbb222bbb222bbb222bbb222bbb222bbb2',
    timestamp: 1709294400,
  },
  {
    author: 'Cara',
    message: 'Feature branch change',
    parents: ['aaa111aaa111aaa111aaa111aaa111aaa111aaa1'],
    sha: 'ccc333ccc333ccc333ccc333ccc333ccc333ccc3',
    timestamp: 1709380800,
  },
  {
    author: 'Alice',
    message: 'Initial import',
    parents: [],
    sha: 'aaa111aaa111aaa111aaa111aaa111aaa111aaa1',
    timestamp: 1709208000,
  },
];

describe('timeline/branchGraph/layout', () => {
  it('assigns side-by-side lanes for a merged branch history', () => {
    const layout = buildBranchLaneLayout(commitsNewestFirst);

    expect(layout.maxLane).toBe(1);
    expect(layout.rows[0]).toMatchObject({
      lane: 0,
      sha: 'ddd444ddd444ddd444ddd444ddd444ddd444ddd4',
    });
    expect(layout.rows[0]?.bottomConnections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fromLane: 0, toLane: 1 }),
      ]),
    );
    expect(layout.rows[1]).toMatchObject({
      lane: 0,
      sha: 'bbb222bbb222bbb222bbb222bbb222bbb222bbb2',
    });
    expect(layout.rows[2]).toMatchObject({
      lane: 1,
      sha: 'ccc333ccc333ccc333ccc333ccc333ccc333ccc3',
    });
    expect(layout.rows[3]).toMatchObject({
      lane: 0,
      sha: 'aaa111aaa111aaa111aaa111aaa111aaa111aaa1',
    });
  });
});
