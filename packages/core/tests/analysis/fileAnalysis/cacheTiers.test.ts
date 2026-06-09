import { describe, expect, it } from 'vitest';
import {
  BASELINE_ANALYSIS_CACHE_TIER,
  SYMBOLS_ANALYSIS_CACHE_TIER,
  createWorkspaceIndexAnalysisCacheTiers,
} from '../../../src/analysis/fileAnalysis/cacheTiers';

describe('analysis/fileAnalysis/cacheTiers', () => {
  it('keeps symbol enrichment inactive when the Symbol root scope is disabled for symbol-only children', () => {
    expect(createWorkspaceIndexAnalysisCacheTiers({
      symbol: false,
      'symbol:function': true,
    })).toEqual({
      active: [BASELINE_ANALYSIS_CACHE_TIER],
      completed: [BASELINE_ANALYSIS_CACHE_TIER],
      required: [BASELINE_ANALYSIS_CACHE_TIER],
    });
  });

  it('requires symbol enrichment when the Variable root scope is enabled while Symbols is disabled', () => {
    expect(createWorkspaceIndexAnalysisCacheTiers({
      symbol: false,
      variable: true,
      'symbol:global': true,
    })).toEqual({
      active: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
      completed: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
      required: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
    });
  });

  it('requires symbol enrichment when the Symbol root scope is enabled', () => {
    expect(createWorkspaceIndexAnalysisCacheTiers({
      symbol: true,
      'symbol:function': true,
    })).toEqual({
      active: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
      completed: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
      required: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
    });
  });
});
