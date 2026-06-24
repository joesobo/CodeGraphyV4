import { describe, expect, it } from 'vitest';
import type {
  GraphViewAnalysisExecutionState,
  GraphViewAnalysisMode,
} from '../../../../../../src/extension/graphView/analysis/execution';
import {
  resolveGraphIndexStatus,
  shouldReportGraphViewUpdateProgress,
} from '../../../../../../src/extension/graphView/analysis/execution/publish/status';

function createState(
  mode: GraphViewAnalysisMode,
  overrides: Partial<GraphViewAnalysisExecutionState> = {},
): GraphViewAnalysisExecutionState {
  return {
    analyzer: undefined,
    analyzerInitialized: false,
    analyzerInitPromise: undefined,
    mode,
    filterPatterns: [],
    disabledPlugins: new Set(),
    ...overrides,
  };
}

describe('extension/graphView/analysis/execution/publish/status', () => {
  it('uses analyzer-provided index status when available', () => {
    expect(resolveGraphIndexStatus(createState('load', {
      analyzer: {
        getIndexStatus: () => ({
          freshness: 'stale',
          detail: 'CodeGraphy index is stale: plugins changed.',
        }),
      } as GraphViewAnalysisExecutionState['analyzer'],
    }), true)).toEqual({
      freshness: 'stale',
      detail: 'CodeGraphy index is stale: plugins changed.',
    });
  });

  it('falls back to fresh status when an index exists', () => {
    expect(resolveGraphIndexStatus(createState('load'), true)).toEqual({
      freshness: 'fresh',
      detail: 'CodeGraphy index is fresh.',
    });
  });

  it('falls back to missing status when no index exists', () => {
    expect(resolveGraphIndexStatus(undefined, false)).toEqual({
      freshness: 'missing',
      detail: 'CodeGraphy index is missing. Index the workspace to build the graph.',
    });
  });

  it.each([
    'index',
    'refresh',
    'incremental',
  ] as const)('reports graph view update progress for %s mode', (mode) => {
    expect(shouldReportGraphViewUpdateProgress(createState(mode))).toBe(true);
  });

  it.each([
    'analyze',
    'load',
  ] as const)('skips graph view update progress for %s mode', (mode) => {
    expect(shouldReportGraphViewUpdateProgress(createState(mode))).toBe(false);
  });
});
