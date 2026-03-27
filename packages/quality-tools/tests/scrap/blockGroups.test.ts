import { describe, expect, it } from 'vitest';
import { blockPathFromKey, blockPathKey, prefixBlockGroups } from '../../src/scrap/blockGroups';
import { type ScrapExampleMetric } from '../../src/scrap/scrapTypes';

function metric(blockPath: string[], name: string): ScrapExampleMetric {
  return {
    assertionCount: 1,
    blockPath,
    branchCount: 0,
    describeDepth: blockPath.length,
    duplicateSetupGroupSize: 0,
    endLine: 10,
    helperCallCount: 0,
    helperHiddenLineCount: 0,
    lineCount: 4,
    mockCount: 0,
    name,
    score: 3,
    setupLineCount: 0,
    startLine: 7
  };
}

describe('blockGroups', () => {
  it('serializes and deserializes block paths', () => {
    expect(blockPathFromKey(blockPathKey(['outer', 'inner']))).toEqual(['outer', 'inner']);
  });

  it('builds prefix groups for nested block paths', () => {
    const groups = prefixBlockGroups([
      metric(['outer'], 'a'),
      metric(['outer', 'inner'], 'b'),
      metric([], 'top-level')
    ]);

    expect([...groups.entries()]).toEqual([
      [blockPathKey(['outer']), [metric(['outer'], 'a'), metric(['outer', 'inner'], 'b')]],
      [blockPathKey(['outer', 'inner']), [metric(['outer', 'inner'], 'b')]]
    ]);
  });
});
