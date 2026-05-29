import { describe, expect, it } from 'vitest';
import {
  BASELINE_ANALYSIS_CACHE_TIER,
  SYMBOLS_ANALYSIS_CACHE_TIER,
} from '../../../../../src/extension/pipeline/fileAnalysis';
import { createWorkspacePipelineAnalysisCacheTiers } from '../../../../../src/extension/pipeline/service/cache/tiers';

describe('pipeline/service/cache/tiers', () => {
  it('requires symbol cache enrichment when a symbol child scope is enabled', () => {
    expect(createWorkspacePipelineAnalysisCacheTiers({
      symbol: false,
      'symbol:function': true,
    })).toEqual({
      active: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
      completed: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
      required: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
    });
  });
});
