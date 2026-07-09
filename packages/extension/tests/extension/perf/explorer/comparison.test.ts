import { describe, expect, it } from 'vitest';
import { parsePerfScenarioComparison } from '../../../../src/extension/perf/explorer/comparison';

describe('extension/perf/explorer/comparison', () => {
  it('parses the strict rename and reveal comparison payload', () => {
    const value = {
      codeGraphyRevealMs: 5,
      explorer: { explorerRenameMs: 10, explorerRevealMs: 4 },
    };

    expect(parsePerfScenarioComparison('rename', value)).toEqual(value);
  });

  it('parses the strict create comparison payload', () => {
    const value = { explorer: { explorerCreateMs: 8 } };

    expect(parsePerfScenarioComparison('create', value)).toEqual(value);
  });

  it('parses the strict delete comparison payload', () => {
    const value = { explorer: { explorerDeleteMs: 9 } };

    expect(parsePerfScenarioComparison('delete', value)).toEqual(value);
  });

  it('rejects comparison fields from another scenario', () => {
    expect(() => parsePerfScenarioComparison('create', {
      explorer: { explorerDeleteMs: 9 },
    })).toThrow();
  });

  it('rejects unknown nested comparison fields', () => {
    expect(() => parsePerfScenarioComparison('rename', {
      codeGraphyRevealMs: 5,
      explorer: {
        explorerRenameMs: 10,
        explorerRevealMs: 4,
        extra: 1,
      },
    })).toThrow();
  });

  it('rejects comparison payloads for non-comparable scenarios', () => {
    expect(() => parsePerfScenarioComparison('single-save', {
      explorer: { explorerCreateMs: 8 },
    })).toThrow('does not support an Explorer comparison payload');
  });
});
