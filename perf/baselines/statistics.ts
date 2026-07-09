import {
  perfReportSchema,
  type PerfReport,
} from '../report';

interface MeasurementEntry {
  key: string;
  path: string[];
  value: number;
}

export interface PerfReportAggregate {
  coefficientOfVariation: Record<string, number>;
  report: PerfReport;
}

function requireSamples(values: readonly number[]): number[] {
  if (values.length === 0) {
    throw new Error('Performance statistics require at least one sample');
  }

  for (const value of values) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error('Performance samples must be finite nonnegative numbers');
    }
  }

  return [...values].sort((left, right) => left - right);
}

export function median(values: readonly number[]): number {
  const ordered = requireSamples(values);
  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 1) return ordered[middle];
  return (ordered[middle - 1] + ordered[middle]) / 2;
}

export function coefficientOfVariation(values: readonly number[]): number {
  const ordered = requireSamples(values);
  if (ordered.length === 1) return 0;

  const mean = ordered.reduce((total, value) => total + value, 0)
    / ordered.length;
  if (mean === 0) return 0;

  const squaredDeviation = ordered.reduce(
    (total, value) => total + ((value - mean) ** 2),
    0,
  );
  const sampleDeviation = Math.sqrt(squaredDeviation / (ordered.length - 1));
  return sampleDeviation / mean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectEntries(
  value: unknown,
  path: string[],
  entries: MeasurementEntry[],
): void {
  if (typeof value === 'number') {
    entries.push({ key: path.join('.'), path, value });
    return;
  }
  if (!isRecord(value)) {
    throw new Error(`Performance report key ${path.join('.')} is not numeric`);
  }

  for (const key of Object.keys(value).sort()) {
    collectEntries(value[key], [...path, key], entries);
  }
}

function measurementEntries(report: PerfReport): MeasurementEntry[] {
  const entries: MeasurementEntry[] = [];
  for (const group of ['metrics', 'webview', 'explorer', 'ratios'] as const) {
    collectEntries(report[group], [group], entries);
  }
  return entries;
}

export function collectPerfReportMeasurements(
  value: unknown,
): Record<string, number> {
  const report = perfReportSchema.parse(value);
  return Object.fromEntries(
    measurementEntries(report).map(entry => [entry.key, entry.value]),
  );
}

function assertCompatibleReports(reports: readonly PerfReport[]): void {
  const first = reports[0];
  const expectedIdentity = JSON.stringify({
    fixture: first.fixture,
    runner: first.runner,
    variant: first.variant,
  });
  for (const report of reports.slice(1)) {
    const identity = JSON.stringify({
      fixture: report.fixture,
      runner: report.runner,
      variant: report.variant,
    });
    if (identity !== expectedIdentity) {
      throw new Error(
        'Performance runs must use the same fixture, variant, and runner metadata',
      );
    }
  }
}

function assertSameMeasurementKeys(
  expected: readonly MeasurementEntry[],
  actual: readonly MeasurementEntry[],
): void {
  const expectedKeys = expected.map(entry => entry.key);
  const actualKeys = actual.map(entry => entry.key);
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    throw new Error('Performance report measurement keys do not match');
  }
}

function setMeasurement(
  report: PerfReport,
  path: readonly string[],
  value: number,
): void {
  let target = report as unknown as Record<string, unknown>;
  for (const segment of path.slice(0, -1)) {
    const next = target[segment];
    if (!isRecord(next)) {
      throw new Error(`Missing performance report key ${path.join('.')}`);
    }
    target = next;
  }
  target[path.at(-1)!] = value;
}

export function aggregatePerfReports(
  values: readonly unknown[],
): PerfReportAggregate {
  if (values.length === 0) {
    throw new Error('Performance report aggregation requires at least one report');
  }

  const reports = values.map(value => perfReportSchema.parse(value));
  assertCompatibleReports(reports);
  const samples = reports.map(measurementEntries);
  const reference = samples[0];
  for (const entries of samples.slice(1)) {
    assertSameMeasurementKeys(reference, entries);
  }

  const report = structuredClone(reports[0]);
  const variation: Record<string, number> = {};
  for (const [index, measurement] of reference.entries()) {
    const metricSamples = samples.map(entries => entries[index].value);
    setMeasurement(report, measurement.path, median(metricSamples));
    variation[measurement.key] = coefficientOfVariation(metricSamples);
  }

  return {
    coefficientOfVariation: variation,
    report: perfReportSchema.parse(report),
  };
}
