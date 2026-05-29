import { describe, expect, it } from 'vitest';
import {
  BASELINE_ANALYSIS_CACHE_TIER,
} from '../../../../../src/extension/pipeline/fileAnalysis';
import { createWorkspacePipelineAnalysisCacheTiers } from '../../../../../src/extension/pipeline/service/cache/tiers';

describe('pipeline/service/cache/tiers', () => {
  it('keeps symbol cache enrichment inactive when the Symbol root scope is disabled', () => {
    expect(createWorkspacePipelineAnalysisCacheTiers({
      symbol: false,
      'symbol:function': true,
    })).toEqual({
      active: [BASELINE_ANALYSIS_CACHE_TIER],
      completed: [BASELINE_ANALYSIS_CACHE_TIER],
      required: [BASELINE_ANALYSIS_CACHE_TIER],
    });
  });
});
