import {
  perfReportSchema,
  type PerfReport,
} from '../report';
import { median } from '../baselines/statistics';
import type {
  LaunchPerfScenario,
  PerfSmokeResult,
} from './launch';
import { collectOperationMetrics } from './operationMetrics/model';
import { scriptedPerfScenarios } from './scenarioSuite';

interface ReportMetric {
  dimension?: string;
  metric: string;
  operationId?: string;
  unit: string;
  value: number;
}

type ScenarioResults = ReadonlyMap<LaunchPerfScenario, PerfSmokeResult>;
type ScenarioMetrics = ReadonlyMap<LaunchPerfScenario, readonly ReportMetric[]>;

const operationScenarios = new Set<LaunchPerfScenario>([
  'single-save',
  'rename',
  'create',
  'delete',
  'batch-100',
]);

type WebviewMetric = keyof PerfReport['webview'];
type ExplorerMetric = keyof PerfReport['explorer'];

export interface AssemblePerfReportInput {
  codeGraphyRevealMs?: number;
  explorer?: Partial<PerfReport['explorer']>;
  idleCpuPct?: number;
  results: PerfSmokeResult[];
  runner: PerfReport['runner'];
  variant: PerfReport['variant'];
  webview?: Partial<PerfReport['webview']>;
}

interface CollectedComparisons {
  codeGraphyRevealMs?: number;
  explorer: Partial<PerfReport['explorer']>;
}

function collectScenarioResults(results: readonly PerfSmokeResult[]): ScenarioResults {
  const byScenario = new Map<LaunchPerfScenario, PerfSmokeResult>();

  for (const scenario of scriptedPerfScenarios) {
    const matches = results.filter(result => result.scenario === scenario);
    if (matches.length === 0) {
      throw new Error(`Missing required scenario result: ${scenario}`);
    }
    if (matches.length > 1) {
      throw new Error(`Duplicate scenario result: ${scenario}`);
    }
    byScenario.set(scenario, matches[0]);
  }

  return byScenario;
}

function getScenarioResult(
  results: ScenarioResults,
  scenario: LaunchPerfScenario,
): PerfSmokeResult {
  const result = results.get(scenario);
  if (!result) {
    throw new Error(`Missing required scenario result: ${scenario}`);
  }
  return result;
}

function collectComparisons(results: ScenarioResults): CollectedComparisons {
  const values = new Map<string, number>();
  const add = (metricName: string, value: number): void => {
    if (values.has(metricName)) {
      throw new Error(`Duplicate comparison measurement: ${metricName}`);
    }
    values.set(metricName, value);
  };

  for (const scenario of scriptedPerfScenarios) {
    const comparison = getScenarioResult(results, scenario).comparison;
    if (!comparison) continue;
    if ('codeGraphyRevealMs' in comparison) {
      add('codeGraphyRevealMs', comparison.codeGraphyRevealMs);
    }
    for (const [metricName, value] of Object.entries(comparison.explorer)) {
      add(metricName, value);
    }
  }

  return {
    codeGraphyRevealMs: values.get('codeGraphyRevealMs'),
    explorer: Object.fromEntries(
      (['explorerRenameMs', 'explorerCreateMs', 'explorerDeleteMs', 'explorerRevealMs'] as const)
        .flatMap(metricName => {
          const value = values.get(metricName);
          return value === undefined ? [] : [[metricName, value]];
        }),
    ),
  };
}

function getResultMetrics(result: PerfSmokeResult): readonly ReportMetric[] {
  // Runner metrics land in independent implementation lanes. Keeping assembly
  // structural lets later frame and Explorer metrics flow through without
  // coupling this reducer to the launcher's rollout order.
  return result.metrics as readonly ReportMetric[];
}

function validateMeasuredOperationIds(
  scenario: LaunchPerfScenario,
  operationIds: readonly string[],
): void {
  if (operationIds.length === 0) {
    throw new Error(`Scenario ${scenario} has no measured operation-ID metrics`);
  }
  if (scenario === 'batch-100') {
    if (operationIds.length !== 6) {
      throw new Error(
        `Scenario batch-100 requires exactly 6 measured operation IDs; found ${operationIds.length}`,
      );
    }
    return;
  }
  if (operationIds.length > 1) {
    throw new Error(
      `Scenario ${scenario} has multiple measured operation IDs: ${operationIds.join(', ')}`,
    );
  }
}

function selectMeasuredMetrics(result: PerfSmokeResult): readonly ReportMetric[] {
  const metrics = getResultMetrics(result);
  if (!operationScenarios.has(result.scenario)) return metrics;

  const operationIds = [...new Set(
    metrics.flatMap(metric => metric.operationId ? [metric.operationId] : []),
  )].sort();
  validateMeasuredOperationIds(result.scenario, operationIds);

  const measuredOperationIds = result.scenario === 'batch-100'
    ? new Set(operationIds)
    : new Set(operationIds.slice(0, 1));
  return metrics.filter(metric =>
    metric.operationId !== undefined
    && measuredOperationIds.has(metric.operationId));
}

function collectScenarioMetrics(results: ScenarioResults): ScenarioMetrics {
  return new Map(scriptedPerfScenarios.map(scenario => [
    scenario,
    selectMeasuredMetrics(getScenarioResult(results, scenario)),
  ]));
}

function metricsForScenario(
  metrics: ScenarioMetrics,
  scenario: LaunchPerfScenario,
): readonly ReportMetric[] {
  return metrics.get(scenario) ?? [];
}

function exactlyOneMetric(
  metrics: ScenarioMetrics,
  scenario: LaunchPerfScenario,
  metricName: string,
): number {
  const matches = metricsForScenario(metrics, scenario)
    .filter(metric => metric.metric === metricName);
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one ${metricName} metric for ${scenario}; found ${matches.length}`,
    );
  }
  return matches[0].value;
}

function allMetrics(metrics: ScenarioMetrics): ReportMetric[] {
  return scriptedPerfScenarios.flatMap(
    scenario => [...metricsForScenario(metrics, scenario)],
  );
}

function requireValues(values: readonly number[], metricName: string): void {
  if (values.length === 0) {
    throw new Error(`Expected at least one ${metricName} metric; found 0`);
  }
}

function sum(values: readonly number[]): number {
  return [...values]
    .sort((left, right) => left - right)
    .reduce((total, value) => total + value, 0);
}

function sumMetric(
  metrics: readonly ReportMetric[],
  metricName: string,
  required = true,
): number {
  const values = metrics
    .filter(metric => metric.metric === metricName)
    .map(metric => metric.value);
  if (required) requireValues(values, metricName);
  return sum(values);
}

function maxMetric(
  metrics: readonly ReportMetric[],
  metricName: string,
): number {
  const values = metrics
    .filter(metric => metric.metric === metricName)
    .map(metric => metric.value);
  requireValues(values, metricName);
  return Math.max(...values);
}

type ScopeToggleDirection = 'disabled' | 'enabled';
const scopeToggleRepetitions = 5;

interface ScopeToggleSamples {
  disabled: ScopeToggleSample[];
  enabled: ScopeToggleSample[];
}

interface ScopeToggleSample {
  operationId: string;
  ordinal: number;
  value: number;
}

function parseScopeToggleDimension(dimension: string): {
  direction: ScopeToggleDirection;
  row: string;
} {
  for (const direction of ['disabled', 'enabled'] as const) {
    const suffix = `:${direction}`;
    if (dimension.endsWith(suffix) && dimension.length > suffix.length) {
      return { direction, row: dimension.slice(0, -suffix.length) };
    }
  }
  throw new Error(
    `scopeToggleMs dimension must end with :enabled or :disabled: ${dimension}`,
  );
}

function scopeOperationOrdinal(
  row: string,
  operationId: string | undefined,
): number {
  if (!operationId) {
    throw new Error(`scopeToggleMs row ${row} requires an operation ID`);
  }
  const ordinal = Number(operationId.slice(operationId.lastIndexOf(':') + 1));
  if (!Number.isSafeInteger(ordinal) || ordinal < 0) {
    throw new Error(`scopeToggleMs row ${row} has an invalid operation ID: ${operationId}`);
  }
  return ordinal;
}

function orderedScopeDirectionSamples(
  row: string,
  direction: ScopeToggleDirection,
  samples: readonly ScopeToggleSample[],
): ScopeToggleSample[] {
  if (samples.length !== scopeToggleRepetitions) {
    throw new Error(
      `scopeToggleMs row ${row} requires exactly ${scopeToggleRepetitions} ${direction} measurements; found ${samples.length}`,
    );
  }
  return [...samples].sort((left, right) => left.ordinal - right.ordinal);
}

function scopeRepetitionMedian(
  row: string,
  samples: ScopeToggleSamples,
): number {
  const enabled = orderedScopeDirectionSamples(row, 'enabled', samples.enabled);
  const disabled = orderedScopeDirectionSamples(row, 'disabled', samples.disabled);
  const operationIds = new Set([...enabled, ...disabled].map(sample => sample.operationId));
  const expectedOperationIds = scopeToggleRepetitions * 2;
  if (operationIds.size !== expectedOperationIds) {
    throw new Error(
      `scopeToggleMs row ${row} requires ${expectedOperationIds} distinct operation IDs`,
    );
  }

  return median(enabled.map((sample, index) => {
    const paired = disabled[index];
    if (Math.abs(sample.ordinal - paired.ordinal) !== 1) {
      throw new Error(`scopeToggleMs row ${row} measurements are not paired repetitions`);
    }
    return Math.max(sample.value, paired.value);
  }));
}

function collectScopeMetrics(metrics: ScenarioMetrics): Record<string, number> {
  const measurements = metricsForScenario(metrics, 'scope-toggle')
    .filter(metric => metric.metric === 'scopeToggleMs');
  requireValues(measurements.map(metric => metric.value), 'scopeToggleMs');

  const byRow = new Map<string, ScopeToggleSamples>();
  for (const measurement of measurements) {
    if (!measurement.dimension) {
      throw new Error(
        'scopeToggleMs metrics for scope-toggle require a row dimension',
      );
    }
    const { direction, row } = parseScopeToggleDimension(measurement.dimension);
    const samples = byRow.get(row) ?? { disabled: [], enabled: [] };
    samples[direction].push({
      operationId: measurement.operationId ?? '',
      ordinal: scopeOperationOrdinal(row, measurement.operationId),
      value: measurement.value,
    });
    byRow.set(row, samples);
  }

  return Object.fromEntries(
    [...byRow.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([row, samples]) => [
        row,
        scopeRepetitionMedian(row, samples),
      ]),
  );
}

function findMeasurement(
  metrics: readonly ReportMetric[],
  metricName: string,
  fallback: number | undefined,
): number {
  const matches = metrics.filter(metric => metric.metric === metricName);
  if (matches.length > 1) {
    throw new Error(`Duplicate measurement: ${metricName}`);
  }
  if (matches.length === 1) return matches[0].value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required measurement: ${metricName}`);
}

function requirePositiveDenominator(metricName: string, value: number): number {
  if (!(value > 0)) {
    throw new Error(`${metricName} must be greater than zero`);
  }
  return value;
}

function assertFixtureConsistency(results: ScenarioResults): PerfReport['fixture'] {
  const coldFixture = getScenarioResult(results, 'cold-open').fixture;
  for (const scenario of scriptedPerfScenarios) {
    const fixture = getScenarioResult(results, scenario).fixture;
    if (fixture !== coldFixture) {
      throw new Error(
        `Scenario ${scenario} fixture ${fixture} does not match ${coldFixture}`,
      );
    }
  }
  return coldFixture;
}

export function assemblePerfReport(input: AssemblePerfReportInput): PerfReport {
  const results = collectScenarioResults(input.results);
  const comparisons = collectComparisons(results);
  const measuredByScenario = collectScenarioMetrics(results);
  const measured = allMetrics(measuredByScenario);
  const operationMetrics = collectOperationMetrics(
    scenario => metricsForScenario(measuredByScenario, scenario),
  );

  const webview = Object.fromEntries(
    (['fpsIdle', 'fpsDrag', 'fpsSettle', 'longTasksPerInteraction', 'heapUsedBytes'] as const)
      .map((metricName: WebviewMetric) => [
        metricName,
        findMeasurement(measured, metricName, input.webview?.[metricName]),
      ]),
  ) as PerfReport['webview'];
  const explorer = Object.fromEntries(
    (['explorerRenameMs', 'explorerCreateMs', 'explorerDeleteMs', 'explorerRevealMs'] as const)
      .map((metricName: ExplorerMetric) => [
        metricName,
        comparisons.explorer[metricName]
          ?? findMeasurement(measured, metricName, input.explorer?.[metricName]),
      ]),
  ) as PerfReport['explorer'];

  const fileOpRoundtripMs = {
    rename: exactlyOneMetric(measuredByScenario, 'rename', 'fileOpRoundtripMs'),
    create: exactlyOneMetric(measuredByScenario, 'create', 'fileOpRoundtripMs'),
    delete: exactlyOneMetric(measuredByScenario, 'delete', 'fileOpRoundtripMs'),
    reveal: comparisons.codeGraphyRevealMs
      ?? findMeasurement([], 'codeGraphyRevealMs', input.codeGraphyRevealMs),
  };
  const coldMetrics = metricsForScenario(measuredByScenario, 'cold-open');
  const saveMetrics = metricsForScenario(measuredByScenario, 'single-save');

  return perfReportSchema.parse({
    schemaVersion: 1,
    fixture: assertFixtureConsistency(results),
    variant: input.variant,
    runner: input.runner,
    metrics: {
      coldOpenMs: exactlyOneMetric(measuredByScenario, 'cold-open', 'coldOpenMs'),
      warmOpenMs: exactlyOneMetric(measuredByScenario, 'warm-open', 'warmOpenMs'),
      incrementalRefreshMs: operationMetrics.incrementalRefreshMs,
      payloadBytes: maxMetric(saveMetrics, 'payloadBytes'),
      watcherToGraphMs: operationMetrics.watcherToGraphMs,
      fileOpRoundtripMs,
      layoutResets: sumMetric(saveMetrics, 'layoutResets'),
      cacheSaveMs: maxMetric(measured, 'cacheSaveMs'),
      // The launcher does not retain emission timestamps, so max is the stable
      // cache-size reducer and remains independent of metric arrival order.
      cacheBytes: maxMetric(measured, 'cacheBytes'),
      treeSitterParseMs: sumMetric(coldMetrics, 'treeSitterParseMs'),
      graphBuildMs: sumMetric(coldMetrics, 'graphBuildMs'),
      scopeToggleMs: collectScopeMetrics(measuredByScenario),
      settleTimeMs: maxMetric(measured, 'settleTimeMs'),
      idleCpuPct: findMeasurement(measured, 'idleCpuPct', input.idleCpuPct),
      simTicksAfterSettle: maxMetric(
        metricsForScenario(measuredByScenario, 'idle-watch'),
        'simTicksAfterSettle',
      ),
    },
    webview,
    explorer,
    ratios: {
      renameRatio: fileOpRoundtripMs.rename / requirePositiveDenominator(
        'explorerRenameMs',
        explorer.explorerRenameMs,
      ),
      createRatio: fileOpRoundtripMs.create / requirePositiveDenominator(
        'explorerCreateMs',
        explorer.explorerCreateMs,
      ),
      deleteRatio: fileOpRoundtripMs.delete / requirePositiveDenominator(
        'explorerDeleteMs',
        explorer.explorerDeleteMs,
      ),
      revealRatio: fileOpRoundtripMs.reveal / requirePositiveDenominator(
        'explorerRevealMs',
        explorer.explorerRevealMs,
      ),
    },
  });
}
