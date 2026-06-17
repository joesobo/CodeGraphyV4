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

  it('keeps symbol enrichment inactive when only parent scopes are enabled', () => {
    expect(createWorkspaceIndexAnalysisCacheTiers({
      symbol: true,
      variable: true,
    })).toEqual({
      active: [BASELINE_ANALYSIS_CACHE_TIER],
      completed: [BASELINE_ANALYSIS_CACHE_TIER],
      required: [BASELINE_ANALYSIS_CACHE_TIER],
    });
  });

  it('keeps symbol enrichment inactive when a leaf child is enabled under a disabled parent scope', () => {
    expect(createWorkspaceIndexAnalysisCacheTiers({
      symbol: false,
      variable: true,
      'symbol:global': true,
    })).toEqual({
      active: [BASELINE_ANALYSIS_CACHE_TIER],
      completed: [BASELINE_ANALYSIS_CACHE_TIER],
      required: [BASELINE_ANALYSIS_CACHE_TIER],
    });
  });

  it('requires symbol enrichment when an enabled leaf child has enabled parent scopes', () => {
    expect(createWorkspaceIndexAnalysisCacheTiers({
      symbol: true,
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

  it('requires symbol enrichment when a Unity symbol row is enabled', () => {
    expect(createWorkspaceIndexAnalysisCacheTiers({
      'plugin:codegraphy.unity:symbol': true,
      'plugin:codegraphy.unity:symbol:scene': true,
    })).toEqual({
      active: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
      completed: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
      required: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
    });
  });
});
