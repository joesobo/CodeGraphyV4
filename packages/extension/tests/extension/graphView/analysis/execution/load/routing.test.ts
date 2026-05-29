import { describe, expect, it, vi } from 'vitest';
import { getGraphIndexFreshness } from '../../../../../../src/extension/graphView/analysis/execution/load/freshness';
import { selectGraphViewRawDataLoadDecision } from '../../../../../../src/extension/graphView/analysis/execution/load/routing';
import { createExecutionAnalyzer } from '../fixtures';

describe('graph view analysis execution load routing', () => {
  it.each([
    ['load', 'missing', 'discover', true],
    ['load', 'fresh', 'analyze', false],
    ['load', 'stale', 'refresh', false],
    ['index', 'fresh', 'refresh', false],
    ['refresh', 'missing', 'refresh', false],
    ['analyze', 'stale', 'refresh', false],
    ['analyze', 'missing', 'analyze', false],
    ['incremental', 'stale', 'incremental', false],
  ] as const)(
    'routes %s mode with %s index freshness to %s',
    (mode, freshness, route, shouldDiscover) => {
      expect(selectGraphViewRawDataLoadDecision(mode, freshness)).toEqual({
        route,
        shouldDiscover,
      });
    },
  );

  it('uses explicit index status freshness before falling back to hasIndex', () => {
    expect(getGraphIndexFreshness(createExecutionAnalyzer({
      getIndexStatus: vi.fn(() => ({
        freshness: 'stale' as const,
        detail: 'Workspace Graph Cache is stale.',
      })),
      hasIndex: vi.fn(() => true),
    }))).toBe('stale');
  });

  it('falls back to hasIndex when index status is unavailable', () => {
    expect(getGraphIndexFreshness(createExecutionAnalyzer({
      hasIndex: vi.fn(() => true),
    }))).toBe('fresh');
    expect(getGraphIndexFreshness(createExecutionAnalyzer({
      hasIndex: vi.fn(() => false),
    }))).toBe('missing');
  });
});
