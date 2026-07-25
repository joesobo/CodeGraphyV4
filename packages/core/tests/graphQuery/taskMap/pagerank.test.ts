import { describe, expect, it } from 'vitest';
import { rankTaskMapGraph } from '../../../src/graphQuery/taskMap/pagerank';

describe('core/graphQuery task map PageRank', () => {
  it('preserves rank mass when personalized Files have no graph neighbors', () => {
    const ranks = rankTaskMapGraph(new Map([
      ['isolated.ts', new Map<string, number>()],
      ['left.ts', new Map([['right.ts', 1]])],
      ['right.ts', new Map([['left.ts', 1]])],
    ]), new Map([
      ['isolated.ts', 1],
      ['left.ts', 0],
      ['right.ts', 0],
    ]));

    expect([...ranks.values()].reduce((total, rank) => total + rank, 0)).toBeCloseTo(1, 10);
    expect(ranks.get('isolated.ts')).toBeCloseTo(1, 10);
  });
});
