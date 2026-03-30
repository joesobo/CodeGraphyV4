import { describe, expect, it } from 'vitest';
import { policyFailureMessage } from '../../../../src/scrap/policy/failureMessage';
import { hasPolicyViolations } from '../../../../src/scrap/policy/violations';
import { resolveScrapPolicy } from '../../../../src/scrap/policy/resolve';
import type { ScrapFileMetric } from '../../../../src/scrap/analysis/metrics';
import { createMetrics } from '../../test/run/support';

function metric(overrides: Partial<ScrapFileMetric> = {}): ScrapFileMetric {
  return {
    ...createMetrics()[0],
    ...overrides
  };
}

describe('resolveScrapPolicy', () => {
  it('defaults to advisory policy', () => {
    expect(resolveScrapPolicy(['quality-tools/'])).toBe('advisory');
  });

  it('treats --strict as strict policy', () => {
    expect(resolveScrapPolicy(['--strict', 'quality-tools/'])).toBe('strict');
  });

  it('reads an explicit strict policy preset', () => {
    expect(resolveScrapPolicy(['--policy', 'strict', 'quality-tools/'])).toBe('strict');
  });

  it('reads an explicit advisory policy preset', () => {
    expect(resolveScrapPolicy(['--policy=advisory', 'quality-tools/'])).toBe('advisory');
  });

  it('reads an explicit split policy preset', () => {
    expect(resolveScrapPolicy(['--policy', 'split', 'quality-tools/'])).toBe('split');
  });

  it('reads an explicit review policy preset', () => {
    expect(resolveScrapPolicy(['--policy=review', 'quality-tools/'])).toBe('review');
  });

  it('rejects unknown policy presets', () => {
    expect(() => resolveScrapPolicy(['--policy', 'experimental', 'quality-tools/'])).toThrow(
      'Unknown SCRAP policy preset: experimental'
    );
  });
});

describe('hasPolicyViolations', () => {
  it('keeps advisory mode non-failing', () => {
    expect(hasPolicyViolations([metric({ remediationMode: 'SPLIT' })], 'advisory')).toBe(false);
  });

  it('fails split policy only for split files', () => {
    expect(hasPolicyViolations([metric({ remediationMode: 'SPLIT' })], 'split')).toBe(true);
    expect(
      hasPolicyViolations([
        metric({ remediationMode: 'LOCAL' }),
        metric({ remediationMode: 'SPLIT' })
      ], 'split')
    ).toBe(true);
    expect(
      hasPolicyViolations([metric({ aiActionability: 'REVIEW_FIRST', remediationMode: 'LOCAL' })], 'split')
    ).toBe(false);
  });

  it('fails review policy only for review-first files', () => {
    expect(
      hasPolicyViolations([metric({ aiActionability: 'REVIEW_FIRST', remediationMode: 'LOCAL' })], 'review')
    ).toBe(true);
    expect(
      hasPolicyViolations([
        metric({ remediationMode: 'STABLE' }),
        metric({ aiActionability: 'REVIEW_FIRST', remediationMode: 'LOCAL' })
      ], 'review')
    ).toBe(true);
    expect(hasPolicyViolations([metric({ remediationMode: 'SPLIT' })], 'review')).toBe(false);
  });

  it('fails strict policy for split or review-first files', () => {
    expect(
      hasPolicyViolations([
        metric({ aiActionability: 'REVIEW_FIRST', remediationMode: 'LOCAL' }),
        metric({ remediationMode: 'STABLE' })
      ], 'strict')
    ).toBe(true);
    expect(hasPolicyViolations([metric({ remediationMode: 'SPLIT' })], 'strict')).toBe(true);
    expect(
      hasPolicyViolations([
        metric({ remediationMode: 'STABLE' }),
        metric({ remediationMode: 'SPLIT' })
      ], 'strict')
    ).toBe(true);
  });
});

describe('policyFailureMessage', () => {
  it('returns messages for enforced policies only', () => {
    expect(policyFailureMessage('advisory')).toBeUndefined();
    expect(policyFailureMessage('split')).toBe('SCRAP split policy failed: split files are present.');
    expect(policyFailureMessage('review')).toBe('SCRAP review policy failed: review-first files are present.');
    expect(policyFailureMessage('strict')).toBe(
      'SCRAP strict mode failed: split or review-first files are present.'
    );
  });
});
