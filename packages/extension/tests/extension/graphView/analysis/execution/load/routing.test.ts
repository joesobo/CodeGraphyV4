import { describe, expect, it, vi } from 'vitest';
import { getGraphIndexFreshness } from '../../../../../../src/extension/graphView/analysis/execution/load/freshness';
import { selectGraphViewRawDataLoadDecision } from '../../../../../../src/extension/graphView/analysis/execution/load/routing';
import { createExecutionAnalyzer } from '../fixtures';

describe('graph view analysis execution load routing', () => {
  it.each([
    ['load', 'missing', false, 'empty'],
    ['load', 'fresh', false, 'empty'],
    ['load', 'stale', true, 'cached'],
    ['index', 'fresh', false, 'refresh'],
    ['refresh', 'missing', false, 'refresh'],
  ] as const)(
    'routes %s mode with %s index freshness to %s',
    (mode, freshness, canLoadCachedGraph, route) => {
      expect(
        selectGraphViewRawDataLoadDecision(mode, freshness, canLoadCachedGraph),
      ).toEqual({ route });
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
