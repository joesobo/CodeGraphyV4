import type { PerfReport } from '../report';
import { selectPerfBaselineReport } from './document';
import {
  aggregatePerfReports,
  collectPerfReportMeasurements,
} from './statistics';

export const DEFAULT_TIMING_CV_LIMIT = 0.10;
export const DEFAULT_RATIO_CV_LIMIT = 0.15;
export const DEFAULT_REGRESSION_LIMIT = 0.20;

export interface PerfStabilityLimits {
  ratio?: number;
  timing?: number;
}

export interface PerfStabilityViolation {
  coefficientOfVariation: number;
  key: string;
  kind: 'stability';
  limit: number;
}

export interface PerfStabilityEvaluation {
  coefficientOfVariation: Record<string, number>;
  medianReport: PerfReport;
  passed: boolean;
  violations: PerfStabilityViolation[];
}

export interface PerfRegressionViolation {
  baseline: number;
  current: number;
  key: string;
  kind: 'regression';
  limit: number;
  regression: number;
}

export type PerfBudgetViolation = PerfStabilityViolation | PerfRegressionViolation;

export interface PerfBudgetInput {
  baselineDocuments: readonly unknown[];
  regressionLimit?: number;
  reports: readonly unknown[];
  stabilityLimits?: PerfStabilityLimits;
}

export interface PerfBudgetEvaluation {
  baselineReport: PerfReport;
  coefficientOfVariation: Record<string, number>;
  medianReport: PerfReport;
  passed: boolean;
  violations: PerfBudgetViolation[];
}

function variationLimit(
  key: string,
  limits: Required<PerfStabilityLimits>,
): number | undefined {
  if (key.startsWith('ratios.')) return limits.ratio;
  if (key.split('.').some(segment => segment.endsWith('Ms'))) {
    return limits.timing;
  }
  return undefined;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function evaluatePerfStability(
  reports: readonly unknown[],
  inputLimits: PerfStabilityLimits = {},
): PerfStabilityEvaluation {
  const limits: Required<PerfStabilityLimits> = {
    ratio: inputLimits.ratio ?? DEFAULT_RATIO_CV_LIMIT,
    timing: inputLimits.timing ?? DEFAULT_TIMING_CV_LIMIT,
  };
  const aggregate = aggregatePerfReports(reports);
  const violations = Object.entries(aggregate.coefficientOfVariation)
    .flatMap(([key, coefficient]) => {
      const limit = variationLimit(key, limits);
      return limit !== undefined && coefficient >= limit
        ? [{
            coefficientOfVariation: coefficient,
            key,
            kind: 'stability' as const,
            limit,
          }]
        : [];
    })
    .sort((left, right) => left.key.localeCompare(right.key));

  return {
    coefficientOfVariation: aggregate.coefficientOfVariation,
    medianReport: aggregate.report,
    passed: violations.length === 0,
    violations,
  };
}

export function assertPerfStability(
  reports: readonly unknown[],
  limits: PerfStabilityLimits = {},
): PerfStabilityEvaluation {
  const evaluation = evaluatePerfStability(reports, limits);
  if (!evaluation.passed) {
    const details = evaluation.violations.map(violation => (
      `${violation.key} CV ${formatPercent(violation.coefficientOfVariation)}`
      + ` must be below ${formatPercent(violation.limit)}`
    ));
    throw new Error(`Performance stability failed:\n- ${details.join('\n- ')}`);
  }
  return evaluation;
}

function assertMatchingMeasurementKeys(
  current: Record<string, number>,
  baseline: Record<string, number>,
): void {
  const currentKeys = Object.keys(current).sort();
  const baselineKeys = Object.keys(baseline).sort();
  if (JSON.stringify(currentKeys) !== JSON.stringify(baselineKeys)) {
    throw new Error('Baseline report measurement keys do not match current report');
  }
}

function higherIsBetter(key: string): boolean {
  return key === 'webview.fpsIdle'
    || key === 'webview.fpsDrag'
    || key === 'webview.fpsSettle';
}

function regressionFraction(
  key: string,
  current: number,
  baseline: number,
): number {
  if (higherIsBetter(key)) {
    if (baseline === 0) return 0;
    return Math.max(0, (baseline - current) / baseline);
  }
  if (baseline === 0) return current === 0 ? 0 : Number.POSITIVE_INFINITY;
  return Math.max(0, (current - baseline) / baseline);
}

export function evaluatePerfBudget(
  input: PerfBudgetInput,
): PerfBudgetEvaluation {
  const regressionLimit = input.regressionLimit ?? DEFAULT_REGRESSION_LIMIT;
  const stability = evaluatePerfStability(input.reports, input.stabilityLimits);
  const baselineReport = selectPerfBaselineReport(
    input.baselineDocuments,
    stability.medianReport,
  );
  const currentMeasurements = collectPerfReportMeasurements(
    stability.medianReport,
  );
  const baselineMeasurements = collectPerfReportMeasurements(baselineReport);
  assertMatchingMeasurementKeys(currentMeasurements, baselineMeasurements);

  const regressionViolations = Object.keys(currentMeasurements)
    .sort()
    .flatMap((key): PerfRegressionViolation[] => {
      const current = currentMeasurements[key];
      const baseline = baselineMeasurements[key];
      const regression = regressionFraction(key, current, baseline);
      return regression > regressionLimit
        ? [{
            baseline,
            current,
            key,
            kind: 'regression',
            limit: regressionLimit,
            regression,
          }]
        : [];
    });
  const violations: PerfBudgetViolation[] = [
    ...stability.violations,
    ...regressionViolations,
  ];

  return {
    baselineReport,
    coefficientOfVariation: stability.coefficientOfVariation,
    medianReport: stability.medianReport,
    passed: violations.length === 0,
    violations,
  };
}

function formatViolation(violation: PerfBudgetViolation): string {
  if (violation.kind === 'stability') {
    return `${violation.key} CV ${formatPercent(violation.coefficientOfVariation)}`
      + ` must be below ${formatPercent(violation.limit)}`;
  }
  return `${violation.key} regressed ${formatPercent(violation.regression)}`
    + ` above ${formatPercent(violation.limit)}`;
}

export function assertPerfBudget(
  input: PerfBudgetInput,
): PerfBudgetEvaluation {
  const evaluation = evaluatePerfBudget(input);
  if (!evaluation.passed) {
    throw new Error(
      `Performance budget failed:\n- ${evaluation.violations.map(formatViolation).join('\n- ')}`,
    );
  }
  return evaluation;
}
