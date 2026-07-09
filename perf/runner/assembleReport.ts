import {
  perfReportSchema,
  type PerfReport,
} from '../report';
import type {
  LaunchPerfScenario,
  PerfSmokeResult,
} from './launch';
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

const operationMetricScenarios = {
  save: 'single-save',
  rename: 'rename',
  create: 'create',
  delete: 'delete',
  batch100: 'batch-100',
} as const satisfies Readonly<Record<string, LaunchPerfScenario>>;

type WebviewMetric = keyof PerfReport['webview'];
type ExplorerMetric = keyof PerfReport['explorer'];

export interface AssemblePerfReportInput {
  codeGraphyRevealMs: number;
  explorer?: Partial<PerfReport['explorer']>;
  idleCpuPct: number;
  results: PerfSmokeResult[];
  runner: PerfReport['runner'];
  variant: PerfReport['variant'];
  webview?: Partial<PerfReport['webview']>;
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

function getResultMetrics(result: PerfSmokeResult): readonly ReportMetric[] {
  // Runner metrics land in independent implementation lanes. Keeping assembly
  // structural lets later frame and Explorer metrics flow through without
  // coupling this reducer to the launcher's rollout order.
  return result.metrics as readonly ReportMetric[];
}

function selectMeasuredMetrics(result: PerfSmokeResult): readonly ReportMetric[] {
  const metrics = getResultMetrics(result);
  if (!operationScenarios.has(result.scenario)) return metrics;

  const operationIds = [...new Set(
    metrics.flatMap(metric => metric.operationId ? [metric.operationId] : []),
  )].sort();

  if (operationIds.length === 0) {
    throw new Error(
      `Scenario ${result.scenario} has no measured operation-ID metrics`,
    );
  }
  if (operationIds.length > 1) {
    throw new Error(
      `Scenario ${result.scenario} has multiple measured operation IDs: ${operationIds.join(', ')}`,
    );
  }

  return metrics.filter(metric => metric.operationId === operationIds[0]);
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

function collectScopeMetrics(metrics: ScenarioMetrics): Record<string, number> {
  const measurements = metricsForScenario(metrics, 'scope-toggle')
    .filter(metric => metric.metric === 'scopeToggleMs');
  requireValues(measurements.map(metric => metric.value), 'scopeToggleMs');

  const byDimension = new Map<string, number>();
  for (const measurement of measurements) {
    if (!measurement.dimension) {
      throw new Error(
        'scopeToggleMs metrics for scope-toggle require a row dimension',
      );
    }
    const current = byDimension.get(measurement.dimension);
    byDimension.set(
      measurement.dimension,
      current === undefined
        ? measurement.value
        : Math.max(current, measurement.value),
    );
  }

  return Object.fromEntries(
    [...byDimension.entries()].sort(([left], [right]) => left.localeCompare(right)),
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
  const measuredByScenario = collectScenarioMetrics(results);
  const measured = allMetrics(measuredByScenario);

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
        findMeasurement(measured, metricName, input.explorer?.[metricName]),
      ]),
  ) as PerfReport['explorer'];

  const fileOpRoundtripMs = {
    rename: exactlyOneMetric(measuredByScenario, 'rename', 'fileOpRoundtripMs'),
    create: exactlyOneMetric(measuredByScenario, 'create', 'fileOpRoundtripMs'),
    delete: exactlyOneMetric(measuredByScenario, 'delete', 'fileOpRoundtripMs'),
    reveal: input.codeGraphyRevealMs,
  };
  const coldMetrics = metricsForScenario(measuredByScenario, 'cold-open');

  return perfReportSchema.parse({
    schemaVersion: 1,
    fixture: assertFixtureConsistency(results),
    variant: input.variant,
    runner: input.runner,
    metrics: {
      coldOpenMs: exactlyOneMetric(measuredByScenario, 'cold-open', 'coldOpenMs'),
      warmOpenMs: exactlyOneMetric(measuredByScenario, 'warm-open', 'warmOpenMs'),
      incrementalRefreshMs: Object.fromEntries(
        Object.entries(operationMetricScenarios).map(([reportKey, scenario]) => [
          reportKey,
          exactlyOneMetric(measuredByScenario, scenario, 'incrementalRefreshMs'),
        ]),
      ),
      payloadBytes: maxMetric(measured, 'payloadBytes'),
      watcherToGraphMs: Object.fromEntries(
        Object.entries(operationMetricScenarios).map(([reportKey, scenario]) => [
          reportKey,
          exactlyOneMetric(measuredByScenario, scenario, 'watcherToGraphMs'),
        ]),
      ),
      fileOpRoundtripMs,
      layoutResets: sumMetric(measured, 'layoutResets', false),
      cacheSaveMs: maxMetric(measured, 'cacheSaveMs'),
      // The launcher does not retain emission timestamps, so max is the stable
      // cache-size reducer and remains independent of metric arrival order.
      cacheBytes: maxMetric(measured, 'cacheBytes'),
      treeSitterParseMs: sumMetric(coldMetrics, 'treeSitterParseMs'),
      graphBuildMs: sumMetric(coldMetrics, 'graphBuildMs'),
      scopeToggleMs: collectScopeMetrics(measuredByScenario),
      settleTimeMs: maxMetric(measured, 'settleTimeMs'),
      idleCpuPct: input.idleCpuPct,
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
