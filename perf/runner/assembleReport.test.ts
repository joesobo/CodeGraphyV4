import { describe, expect, it } from 'vitest';

import type { PerfReport } from '../report';
import type {
  LaunchPerfScenario,
  PerfSmokeResult,
} from './launch';
import {
  assemblePerfReport,
  type AssemblePerfReportInput,
} from './assembleReport';

type SmokeMetric = PerfSmokeResult['metrics'][number];

const unitByMetric: Record<SmokeMetric['metric'], SmokeMetric['unit']> = {
  coldOpenMs: 'ms',
  warmOpenMs: 'ms',
  incrementalRefreshMs: 'ms',
  payloadBytes: 'bytes',
  watcherToGraphMs: 'ms',
  fileOpRoundtripMs: 'ms',
  layoutResets: 'count',
  cacheSaveMs: 'ms',
  cacheBytes: 'bytes',
  treeSitterParseMs: 'ms',
  graphBuildMs: 'ms',
  scopeToggleMs: 'ms',
  settleTimeMs: 'ms',
  idleCpuPct: 'percent',
  simTicksAfterSettle: 'count',
  fpsIdle: 'fps',
  fpsDrag: 'fps',
  fpsSettle: 'fps',
  longTasksPerInteraction: 'count',
  heapUsedBytes: 'bytes',
};

function metric(
  name: SmokeMetric['metric'],
  value: number,
  dimension?: string,
): SmokeMetric {
  return {
    metric: name,
    unit: unitByMetric[name],
    value,
    ...(dimension ? { dimension } : {}),
  };
}

function result(
  scenario: LaunchPerfScenario,
  metrics: SmokeMetric[],
): PerfSmokeResult {
  return {
    fixture: 'small',
    metrics,
    runId: `run-${scenario}`,
    scenario,
    schemaVersion: 1,
  };
}

function scopeToggleMetrics(metrics: SmokeMetric[]): SmokeMetric[] {
  return metrics.map((entry, ordinal) => ({
    ...entry,
    operationId: `run-scope-toggle:scope-toggle:small:${ordinal}`,
  }));
}

function operationResult(
  scenario: 'single-save' | 'rename' | 'create' | 'delete',
  metrics: SmokeMetric[],
): PerfSmokeResult {
  const operationId = `run-${scenario}:${scenario}:small:0`;
  return result(scenario, [
    ...metrics.map(entry => ({ ...entry, operationId })),
    metric('incrementalRefreshMs', 999, 'cleanup'),
    metric('watcherToGraphMs', 999, 'cleanup'),
    metric('payloadBytes', 99_999, 'cleanup'),
    metric('layoutResets', 100, 'cleanup'),
  ]);
}

function batchOperationResult(
  metrics: SmokeMetric[],
  operationCount = 3,
): PerfSmokeResult {
  return result('batch-100', [
    ...Array.from({ length: operationCount }, (_value, ordinal) => {
      const operationId = `run-batch-100:batch-100:small:${ordinal}`;
      return metrics.map(entry => ({ ...entry, operationId }));
    }).flat(),
    metric('incrementalRefreshMs', 999, 'cleanup'),
    metric('watcherToGraphMs', 999, 'cleanup'),
    metric('payloadBytes', 99_999, 'cleanup'),
    metric('layoutResets', 100, 'cleanup'),
  ]);
}

function createResults(): PerfSmokeResult[] {
  return [
    result('cold-open', [
      metric('coldOpenMs', 1_000),
      metric('treeSitterParseMs', 50, 'typescript'),
      metric('treeSitterParseMs', 70, 'tree-sitter'),
      metric('graphBuildMs', 80, 'files'),
      metric('graphBuildMs', 100, 'symbols'),
      metric('payloadBytes', 2_048),
      metric('cacheSaveMs', 10),
      metric('cacheBytes', 4_000),
      metric('layoutResets', 1),
      metric('settleTimeMs', 250),
    ]),
    result('warm-open', [
      metric('warmOpenMs', 500),
      metric('payloadBytes', 4_096),
      metric('cacheSaveMs', 12),
      metric('cacheBytes', 4_096),
      metric('layoutResets', 2),
      metric('settleTimeMs', 300),
    ]),
    operationResult('single-save', [
      metric('incrementalRefreshMs', 10),
      metric('watcherToGraphMs', 11),
      metric('payloadBytes', 3_000),
      metric('layoutResets', 3),
    ]),
    operationResult('rename', [
      metric('incrementalRefreshMs', 20),
      metric('watcherToGraphMs', 21),
      metric('fileOpRoundtripMs', 25),
    ]),
    operationResult('create', [
      metric('incrementalRefreshMs', 30),
      metric('watcherToGraphMs', 31),
      metric('fileOpRoundtripMs', 35),
    ]),
    operationResult('delete', [
      metric('incrementalRefreshMs', 40),
      metric('watcherToGraphMs', 41),
      metric('fileOpRoundtripMs', 45),
    ]),
    batchOperationResult([
      metric('incrementalRefreshMs', 50),
      metric('watcherToGraphMs', 51),
    ]),
    result('interaction-burst', [metric('settleTimeMs', 280)]),
    result('scope-toggle', scopeToggleMetrics([
      metric('scopeToggleMs', 8, 'files:enabled'),
      metric('scopeToggleMs', 4, 'files:disabled'),
      metric('scopeToggleMs', 9, 'files:enabled'),
      metric('scopeToggleMs', 5, 'files:disabled'),
      metric('scopeToggleMs', 10, 'files:enabled'),
      metric('scopeToggleMs', 6, 'files:disabled'),
      metric('scopeToggleMs', 10, 'symbols:enabled'),
      metric('scopeToggleMs', 7, 'symbols:disabled'),
      metric('scopeToggleMs', 12, 'symbols:enabled'),
      metric('scopeToggleMs', 8, 'symbols:disabled'),
      metric('scopeToggleMs', 14, 'symbols:enabled'),
      metric('scopeToggleMs', 9, 'symbols:disabled'),
    ])),
    result('idle-watch', [
      metric('simTicksAfterSettle', 0),
      metric('simTicksAfterSettle', 2),
    ]),
  ];
}

const runner: PerfReport['runner'] = {
  arch: 'arm64',
  cpuModel: 'Apple M4',
  nodeVersion: 'v22.22.0',
  os: 'darwin',
  runnerClass: 'local-reference',
  vscodeVersion: '1.128.0',
};

function createInput(): AssemblePerfReportInput {
  return {
    codeGraphyRevealMs: 15,
    explorer: {
      explorerCreateMs: 30,
      explorerDeleteMs: 40,
      explorerRenameMs: 20,
      explorerRevealMs: 10,
    },
    idleCpuPct: 0.5,
    results: createResults(),
    runner,
    variant: 'default',
    webview: {
      fpsDrag: 58,
      fpsIdle: 60,
      fpsSettle: 55,
      heapUsedBytes: 1_048_576,
      longTasksPerInteraction: 0,
    },
  };
}

describe('performance report assembly', () => {
  it('assembles every report key with deterministic reducers', () => {
    const report = assemblePerfReport(createInput());

    expect(report).toEqual({
      explorer: {
        explorerCreateMs: 30,
        explorerDeleteMs: 40,
        explorerRenameMs: 20,
        explorerRevealMs: 10,
      },
      fixture: 'small',
      metrics: {
        cacheBytes: 4_096,
        cacheSaveMs: 12,
        coldOpenMs: 1_000,
        fileOpRoundtripMs: { create: 35, delete: 45, rename: 25, reveal: 15 },
        graphBuildMs: 180,
        idleCpuPct: 0.5,
        incrementalRefreshMs: {
          batch100: 50,
          create: 30,
          delete: 40,
          rename: 20,
          save: 10,
        },
        layoutResets: 6,
        payloadBytes: 4_096,
        scopeToggleMs: { files: 9, symbols: 12 },
        settleTimeMs: 300,
        simTicksAfterSettle: 2,
        treeSitterParseMs: 120,
        warmOpenMs: 500,
        watcherToGraphMs: {
          batch100: 51,
          create: 31,
          delete: 41,
          rename: 21,
          save: 11,
        },
      },
      ratios: {
        createRatio: 35 / 30,
        deleteRatio: 45 / 40,
        renameRatio: 25 / 20,
        revealRatio: 15 / 10,
      },
      runner,
      schemaVersion: 1,
      variant: 'default',
      webview: {
        fpsDrag: 58,
        fpsIdle: 60,
        fpsSettle: 55,
        heapUsedBytes: 1_048_576,
        longTasksPerInteraction: 0,
      },
    });
  });

  it('is independent of result and metric arrival order', () => {
    const first = createInput();
    const second = createInput();
    second.results.reverse();
    for (const scenario of second.results) scenario.metrics.reverse();

    expect(assemblePerfReport(second)).toEqual(assemblePerfReport(first));
  });

  it('uses the slowest correlated refresh cycle for each single-operation scenario', () => {
    const input = createInput();
    const rename = input.results.find(result => result.scenario === 'rename')!;
    const create = input.results.find(result => result.scenario === 'create')!;
    const appendMeasuredMetric = (
      target: PerfSmokeResult,
      name: 'incrementalRefreshMs' | 'watcherToGraphMs',
      value: number,
    ): void => {
      const operationId = target.metrics.find(entry => entry.operationId)?.operationId;
      target.metrics.push({ ...metric(name, value), operationId });
    };
    appendMeasuredMetric(rename, 'incrementalRefreshMs', 18);
    appendMeasuredMetric(rename, 'incrementalRefreshMs', 27);
    appendMeasuredMetric(rename, 'watcherToGraphMs', 33);
    appendMeasuredMetric(rename, 'watcherToGraphMs', 19);
    appendMeasuredMetric(create, 'incrementalRefreshMs', 42);
    appendMeasuredMetric(create, 'incrementalRefreshMs', 28);
    appendMeasuredMetric(create, 'watcherToGraphMs', 29);
    appendMeasuredMetric(create, 'watcherToGraphMs', 44);

    const report = assemblePerfReport(input);

    expect(report.metrics.incrementalRefreshMs).toMatchObject({
      create: 42,
      rename: 27,
    });
    expect(report.metrics.watcherToGraphMs).toMatchObject({
      create: 44,
      rename: 33,
    });
  });

  it('uses the median operation maximum for batch refresh metrics', () => {
    const input = createInput();
    const batch = input.results.find(result => result.scenario === 'batch-100')!;
    const correlated = (
      operationOrdinal: number,
      incrementalRefreshMs: readonly number[],
      watcherToGraphMs: readonly number[],
    ): SmokeMetric[] => {
      const operationId = `run-batch-100:batch-100:small:${operationOrdinal}`;
      return [
        ...incrementalRefreshMs.map(value => ({
          ...metric('incrementalRefreshMs', value),
          operationId,
        })),
        ...watcherToGraphMs.map(value => ({
          ...metric('watcherToGraphMs', value),
          operationId,
        })),
      ];
    };
    batch.metrics = [
      ...correlated(0, [40, 100], [41, 110]),
      ...correlated(1, [50, 60], [51, 70]),
      ...correlated(2, [30, 80], [31, 90]),
      metric('incrementalRefreshMs', 999, 'restoration'),
      metric('watcherToGraphMs', 999, 'restoration'),
    ];

    const report = assemblePerfReport(input);

    expect(report.metrics.incrementalRefreshMs.batch100).toBe(80);
    expect(report.metrics.watcherToGraphMs.batch100).toBe(90);
  });

  it.each([1, 4])(
    'requires exactly three measured batch operations instead of %i',
    (operationCount) => {
      const input = createInput();
      const batch = input.results.find(result => result.scenario === 'batch-100')!;
      batch.metrics = batchOperationResult([
        metric('incrementalRefreshMs', 50),
        metric('watcherToGraphMs', 51),
      ], operationCount).metrics;

      expect(() => assemblePerfReport(input)).toThrow(
        `Scenario batch-100 requires exactly 3 measured operation IDs; found ${operationCount}`,
      );
    },
  );

  it('uses the slower directional median for each scope row', () => {
    const input = createInput();
    const scope = input.results.find(result => result.scenario === 'scope-toggle')!;
    scope.metrics = scopeToggleMetrics([
      metric('scopeToggleMs', 100, 'node:folder:enabled'),
      metric('scopeToggleMs', 3, 'node:folder:disabled'),
      metric('scopeToggleMs', 1, 'node:folder:enabled'),
      metric('scopeToggleMs', 7, 'node:folder:disabled'),
      metric('scopeToggleMs', 9, 'node:folder:enabled'),
      metric('scopeToggleMs', 5, 'node:folder:disabled'),
    ]);

    const report = assemblePerfReport(input);

    expect(report.metrics.scopeToggleMs).toEqual({ 'node:folder': 9 });
  });

  it('uses the median slower direction from each paired scope repetition', () => {
    const input = createInput();
    const scope = input.results.find(result => result.scenario === 'scope-toggle')!;
    scope.metrics = scopeToggleMetrics([
      metric('scopeToggleMs', 200, 'node:folder:enabled'),
      metric('scopeToggleMs', 130, 'node:folder:disabled'),
      metric('scopeToggleMs', 130, 'node:folder:enabled'),
      metric('scopeToggleMs', 200, 'node:folder:disabled'),
      metric('scopeToggleMs', 130, 'node:folder:enabled'),
      metric('scopeToggleMs', 130, 'node:folder:disabled'),
    ]);

    const report = assemblePerfReport(input);

    expect(report.metrics.scopeToggleMs).toEqual({ 'node:folder': 200 });
  });

  it('rejects a scope row without measurements in both directions', () => {
    const input = createInput();
    const scope = input.results.find(result => result.scenario === 'scope-toggle')!;
    scope.metrics = scopeToggleMetrics([
      metric('scopeToggleMs', 1, 'node:folder:enabled'),
      metric('scopeToggleMs', 2, 'node:folder:enabled'),
      metric('scopeToggleMs', 3, 'node:folder:enabled'),
    ]);

    expect(() => assemblePerfReport(input)).toThrow(
      'scopeToggleMs row node:folder requires exactly 3 disabled measurements; found 0',
    );
  });

  it('rejects extra scope-direction measurements', () => {
    const input = createInput();
    const scope = input.results.find(result => result.scenario === 'scope-toggle')!;
    scope.metrics = scopeToggleMetrics([
      metric('scopeToggleMs', 1, 'node:folder:enabled'),
      metric('scopeToggleMs', 2, 'node:folder:enabled'),
      metric('scopeToggleMs', 3, 'node:folder:enabled'),
      metric('scopeToggleMs', 4, 'node:folder:enabled'),
      metric('scopeToggleMs', 5, 'node:folder:disabled'),
      metric('scopeToggleMs', 6, 'node:folder:disabled'),
      metric('scopeToggleMs', 7, 'node:folder:disabled'),
    ]);

    expect(() => assemblePerfReport(input)).toThrow(
      'scopeToggleMs row node:folder requires exactly 3 enabled measurements; found 4',
    );
  });

  it('uses normal result metrics before explicit webview and Explorer fallbacks', () => {
    const input = createInput();
    const idle = input.results.find(result => result.scenario === 'idle-watch')!;
    const interaction = input.results.find(result => result.scenario === 'interaction-burst')!;
    const futureMetrics = idle.metrics as unknown as Array<Record<string, unknown>>;
    futureMetrics.push(
      { metric: 'fpsIdle', unit: 'fps', value: 59 },
      { metric: 'fpsSettle', unit: 'fps', value: 54 },
      { metric: 'heapUsedBytes', unit: 'bytes', value: 2_000_000 },
      { metric: 'explorerRenameMs', unit: 'ms', value: 22 },
      { metric: 'explorerCreateMs', unit: 'ms', value: 32 },
      { metric: 'explorerDeleteMs', unit: 'ms', value: 42 },
      { metric: 'explorerRevealMs', unit: 'ms', value: 12 },
    );
    (interaction.metrics as unknown as Array<Record<string, unknown>>).push(
      { metric: 'fpsDrag', unit: 'fps', value: 57 },
      { metric: 'longTasksPerInteraction', unit: 'count', value: 1 },
    );

    const report = assemblePerfReport(input);

    expect(report.webview).toEqual({
      fpsDrag: 57,
      fpsIdle: 59,
      fpsSettle: 54,
      heapUsedBytes: 2_000_000,
      longTasksPerInteraction: 1,
    });
    expect(report.explorer).toEqual({
      explorerCreateMs: 32,
      explorerDeleteMs: 42,
      explorerRenameMs: 22,
      explorerRevealMs: 12,
    });
  });

  it('prefers same-session comparison payloads over explicit fallbacks', () => {
    const input = createInput();
    input.results.find(result => result.scenario === 'rename')!.comparison = {
      codeGraphyRevealMs: 17,
      explorer: { explorerRenameMs: 27, explorerRevealMs: 12 },
    };
    input.results.find(result => result.scenario === 'create')!.comparison = {
      explorer: { explorerCreateMs: 37 },
    };
    input.results.find(result => result.scenario === 'delete')!.comparison = {
      explorer: { explorerDeleteMs: 47 },
    };

    const report = assemblePerfReport(input);

    expect(report.explorer).toEqual({
      explorerRenameMs: 27,
      explorerCreateMs: 37,
      explorerDeleteMs: 47,
      explorerRevealMs: 12,
    });
    expect(report.metrics.fileOpRoundtripMs.reveal).toBe(17);
    expect(report.ratios.revealRatio).toBe(17 / 12);
  });

  it('assembles comparisons and idle CPU without duplicate external inputs', () => {
    const input = createInput();
    input.results.find(result => result.scenario === 'rename')!.comparison = {
      codeGraphyRevealMs: 17,
      explorer: { explorerRenameMs: 27, explorerRevealMs: 12 },
    };
    input.results.find(result => result.scenario === 'create')!.comparison = {
      explorer: { explorerCreateMs: 37 },
    };
    input.results.find(result => result.scenario === 'delete')!.comparison = {
      explorer: { explorerDeleteMs: 47 },
    };
    input.results.find(result => result.scenario === 'idle-watch')!.metrics.push(
      metric('idleCpuPct', 0.75),
    );
    delete input.codeGraphyRevealMs;
    delete input.explorer;
    delete input.idleCpuPct;

    const report = assemblePerfReport(input);

    expect(report.metrics.idleCpuPct).toBe(0.75);
    expect(report.explorer.explorerCreateMs).toBe(37);
  });

  it('rejects duplicate same-session comparison fields', () => {
    const input = createInput();
    input.results.find(result => result.scenario === 'rename')!.comparison = {
      codeGraphyRevealMs: 17,
      explorer: { explorerRenameMs: 27, explorerRevealMs: 12 },
    };
    input.results.find(result => result.scenario === 'create')!.comparison = {
      explorer: { explorerRenameMs: 37 },
    } as never;

    expect(() => assemblePerfReport(input)).toThrow(
      'Duplicate comparison measurement: explorerRenameMs',
    );
  });

  it('rejects a missing comparison and fallback field', () => {
    const input = createInput();
    delete input.explorer!.explorerCreateMs;

    expect(() => assemblePerfReport(input)).toThrow(
      'Missing required measurement: explorerCreateMs',
    );
  });

  it('fails when a scripted scenario result is missing', () => {
    const input = createInput();
    input.results = input.results.filter(result => result.scenario !== 'idle-watch');

    expect(() => assemblePerfReport(input)).toThrow(
      'Missing required scenario result: idle-watch',
    );
  });

  it('fails when a scripted scenario result is duplicated', () => {
    const input = createInput();
    input.results.push(structuredClone(input.results[0]));

    expect(() => assemblePerfReport(input)).toThrow(
      'Duplicate scenario result: cold-open',
    );
  });

  it.each([
    'incrementalRefreshMs',
    'watcherToGraphMs',
  ] as const)('fails when a mapped %s metric is missing', (metricName) => {
    const input = createInput();
    const save = input.results.find(result => result.scenario === 'single-save')!;
    save.metrics = save.metrics.filter(metric => metric.metric !== metricName);

    expect(() => assemblePerfReport(input)).toThrow(
      `Expected exactly one ${metricName} metric for single-save; found 0`,
    );
  });

  it.each([
    'incrementalRefreshMs',
    'watcherToGraphMs',
  ] as const)('rejects duplicate correlated single-save %s metrics', (metricName) => {
    const input = createInput();
    const save = input.results.find(result => result.scenario === 'single-save')!;
    const operationId = save.metrics.find(entry => entry.operationId)?.operationId;
    save.metrics.push({ ...metric(metricName, 12), operationId });

    expect(() => assemblePerfReport(input)).toThrow(
      `Expected exactly one ${metricName} metric for single-save; found 2`,
    );
  });

  it('fails when a direct metric is duplicated', () => {
    const input = createInput();
    const cold = input.results.find(result => result.scenario === 'cold-open')!;
    cold.metrics.push(metric('coldOpenMs', 1_100));

    expect(() => assemblePerfReport(input)).toThrow(
      'Expected exactly one coldOpenMs metric for cold-open; found 2',
    );
  });

  it('fails when an operation scenario has no measured operation ID', () => {
    const input = createInput();
    const rename = input.results.find(result => result.scenario === 'rename')!;
    rename.metrics = rename.metrics.map(({ operationId: _, ...entry }) => entry);

    expect(() => assemblePerfReport(input)).toThrow(
      'Scenario rename has no measured operation-ID metrics',
    );
  });

  it('fails when an Explorer denominator is zero', () => {
    const input = createInput();
    input.explorer!.explorerRenameMs = 0;

    expect(() => assemblePerfReport(input)).toThrow(
      'explorerRenameMs must be greater than zero',
    );
  });

  it('fails when a required fallback and normal metric are both missing', () => {
    const input = createInput();
    delete input.webview!.fpsIdle;

    expect(() => assemblePerfReport(input)).toThrow(
      'Missing required measurement: fpsIdle',
    );
  });

  it('fails when no layout-reset metric was emitted', () => {
    const input = createInput();
    for (const result of input.results) {
      result.metrics = result.metrics.filter(metric => metric.metric !== 'layoutResets');
    }

    expect(() => assemblePerfReport(input)).toThrow(
      'Expected at least one layoutResets metric; found 0',
    );
  });
});
