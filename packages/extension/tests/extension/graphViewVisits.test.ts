import { describe, expect, it } from 'vitest';
import { getGraphViewVisitCount, incrementGraphViewVisitCount } from '../../src/extension/graphViewVisits';

describe('graphViewVisits', () => {
  it('returns zero when a file has not been visited yet', () => {
    expect(getGraphViewVisitCount({}, 'src/app.ts')).toBe(0);
  });

  it('returns the persisted visit count for a file', () => {
    expect(getGraphViewVisitCount({ 'src/app.ts': 4 }, 'src/app.ts')).toBe(4);
  });

  it('increments visit counts for new files', () => {
    expect(incrementGraphViewVisitCount({}, 'src/app.ts')).toEqual({
      visits: { 'src/app.ts': 1 },
      accessCount: 1,
    });
  });

  it('increments visit counts for previously visited files', () => {
    expect(incrementGraphViewVisitCount({ 'src/app.ts': 4 }, 'src/app.ts')).toEqual({
      visits: { 'src/app.ts': 5 },
      accessCount: 5,
    });
  });
});
