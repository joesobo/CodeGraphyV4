import { describe, expect, it } from 'vitest';

import {
  assertPerfBudget,
  assertPerfStability,
  evaluatePerfBudget,
  evaluatePerfStability,
} from './budget';
import { createPerfReport } from './test/report';

describe('performance stability budget', () => {
  it('accepts stable repeated reports', () => {
    const reports = [950, 1_000, 1_050].map(coldOpenMs => {
      const report = createPerfReport();
      report.metrics.coldOpenMs = coldOpenMs;
      return report;
    });

    expect(evaluatePerfStability(reports)).toMatchObject({
      passed: true,
      violations: [],
    });
    expect(() => assertPerfStability(reports)).not.toThrow();
  });

  it('rejects a timing key at the ten-percent CV limit', () => {
    const reports = [900, 1_000, 1_100].map(coldOpenMs => {
      const report = createPerfReport();
      report.metrics.coldOpenMs = coldOpenMs;
      return report;
    });

    expect(() => assertPerfStability(reports)).toThrow(
      'metrics.coldOpenMs CV 10.00% must be below 10.00%',
    );
  });

  it('rejects a ratio key above the fifteen-percent CV limit', () => {
    const reports = [0.8, 1, 1.2].map(renameRatio => {
      const report = createPerfReport();
      report.ratios.renameRatio = renameRatio;
      return report;
    });

    expect(() => assertPerfStability(reports)).toThrow(
      'ratios.renameRatio CV 20.00% must be below 15.00%',
    );
  });
});

describe('performance regression budget', () => {
  it('keeps a no-op run green against its runner-class baseline', () => {
    const baseline = createPerfReport();
    const reports = [
      structuredClone(baseline),
      structuredClone(baseline),
      structuredClone(baseline),
    ];
    const baselineDocuments = [{
      schemaVersion: 1,
      runnerClass: 'linux-x64',
      reports: { 'small:default': baseline },
    }];

    expect(evaluatePerfBudget({ reports, baselineDocuments })).toMatchObject({
      passed: true,
      violations: [],
    });
    expect(() => assertPerfBudget({ reports, baselineDocuments })).not.toThrow();
  });

  it('fails a synthetic five-hundred-millisecond regression', () => {
    const baseline = createPerfReport();
    const reports = [1, 2, 3].map(() => {
      const report = createPerfReport();
      report.metrics.coldOpenMs += 500;
      return report;
    });
    const baselineDocuments = [{
      schemaVersion: 1,
      runnerClass: 'linux-x64',
      reports: { 'small:default': baseline },
    }];

    expect(() => assertPerfBudget({ reports, baselineDocuments })).toThrow(
      'metrics.coldOpenMs regressed 50.00% above 20.00%',
    );
  });

  it('allows a regression at exactly twenty percent', () => {
    const baseline = createPerfReport();
    const reports = [1, 2, 3].map(() => {
      const report = createPerfReport();
      report.metrics.coldOpenMs = 1_200;
      return report;
    });
    const baselineDocuments = [{
      schemaVersion: 1,
      runnerClass: 'linux-x64',
      reports: { 'small:default': baseline },
    }];

    expect(evaluatePerfBudget({ reports, baselineDocuments }).passed).toBe(true);
  });

  it('fails an FPS drop greater than twenty percent', () => {
    const baseline = createPerfReport();
    const reports = [1, 2, 3].map(() => {
      const report = createPerfReport();
      report.webview.fpsDrag = 45;
      return report;
    });
    const baselineDocuments = [{
      schemaVersion: 1,
      runnerClass: 'linux-x64',
      reports: { 'small:default': baseline },
    }];

    expect(() => assertPerfBudget({ reports, baselineDocuments })).toThrow(
      'webview.fpsDrag regressed 22.41% above 20.00%',
    );
  });
});
