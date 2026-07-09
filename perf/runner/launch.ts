import { createRequire } from 'node:module';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import {
  createPerfRunEnvironment,
  type PerfRunEnvironment,
} from './environment';
import { waitForIdleCpuReady } from './idleCpu/coordination';
import {
  sampleVsCodeIdleCpu,
  type IdleCpuSampleOptions,
  type IdleCpuSampleResult,
} from './idleCpu/sample';
import {
  parsePerfScenarioComparison,
  perfScenarioComparisonSchema,
} from '../../packages/extension/src/extension/perf/explorer/comparison';
import type { PerfFixture } from '../report';

export interface RunVSCodeTestsOptions {
  extensionDevelopmentPath: string;
  extensionTestsPath: string;
  extensionTestsEnv: Record<string, string>;
  launchArgs: string[];
  version: string;
}

export type RunVSCodeTests = (options: RunVSCodeTestsOptions) => Promise<number>;

export const launchPerfScenarioSchema = z.enum([
  'cold-open',
  'warm-open',
  'single-save',
  'rename',
  'create',
  'delete',
  'batch-100',
  'interaction-burst',
  'scope-toggle',
  'idle-watch',
]);
export type LaunchPerfScenario = z.infer<typeof launchPerfScenarioSchema>;

export interface LaunchPerfSessionOptions {
  environment?: PerfRunEnvironment;
  fixture: PerfFixture;
  repoRoot: string;
  resultPath: string;
  runId: string;
  scenario?: LaunchPerfScenario;
  symbols?: boolean;
  vscodeVersion: string;
}

export interface LaunchPerfSessionDependencies {
  runTests?: RunVSCodeTests;
  sampleIdleCpu?: (options: IdleCpuSampleOptions) => Promise<IdleCpuSampleResult>;
  waitForIdleReady?: (markerPath: string) => Promise<void>;
}

const coreMetricNameSchema = z.enum([
  'coldOpenMs',
  'warmOpenMs',
  'incrementalRefreshMs',
  'payloadBytes',
  'watcherToGraphMs',
  'fileOpRoundtripMs',
  'layoutResets',
  'cacheSaveMs',
  'cacheBytes',
  'treeSitterParseMs',
  'graphBuildMs',
  'scopeToggleMs',
  'settleTimeMs',
  'idleCpuPct',
  'simTicksAfterSettle',
  'fpsIdle',
  'fpsDrag',
  'fpsSettle',
  'longTasksPerInteraction',
  'heapUsedBytes',
]);
const metricUnitSchema = z.enum(['ms', 'bytes', 'count', 'fps', 'percent']);
type CoreMetricName = z.infer<typeof coreMetricNameSchema>;
type MetricUnit = z.infer<typeof metricUnitSchema>;
const expectedMetricUnits: Readonly<Record<CoreMetricName, MetricUnit>> = {
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
const smokeMetricSchema = z.strictObject({
  dimension: z.string().min(1).optional(),
  metric: coreMetricNameSchema,
  operationId: z.string().min(1).optional(),
  unit: metricUnitSchema,
  value: z.number().finite().nonnegative(),
}).superRefine((metric, issues) => {
  if (metric.unit !== expectedMetricUnits[metric.metric]) {
    issues.addIssue({
      code: 'custom',
      path: ['unit'],
      message: `${metric.metric} must use ${expectedMetricUnits[metric.metric]}`,
    });
  }
});

const perfSmokeResultSchema = z.strictObject({
  comparison: perfScenarioComparisonSchema.optional(),
  schemaVersion: z.literal(1),
  fixture: z.enum(['small', 'medium', 'large', 'huge', 'giant', 'self']),
  runId: z.string().min(1),
  scenario: launchPerfScenarioSchema,
  metrics: z.array(smokeMetricSchema).min(1),
}).superRefine((result, issues) => {
  const expectedMetric = result.scenario === 'cold-open'
    ? 'coldOpenMs'
    : result.scenario === 'warm-open'
      ? 'warmOpenMs'
      : undefined;
  if (expectedMetric && !result.metrics.some(metric => metric.metric === expectedMetric)) {
    issues.addIssue({
      code: 'custom',
      path: ['metrics'],
      message: `${result.scenario} requires ${expectedMetric}`,
    });
  }
  if (result.comparison) {
    try {
      parsePerfScenarioComparison(result.scenario, result.comparison);
    } catch {
      issues.addIssue({
        code: 'custom',
        path: ['comparison'],
        message: `Comparison payload does not match scenario ${result.scenario}`,
      });
    }
  }
});

export type PerfSmokeResult = z.infer<typeof perfSmokeResultSchema>;

function loadRunTests(repoRoot: string): RunVSCodeTests {
  const requireFromExtension = createRequire(
    join(repoRoot, 'packages/extension/package.json'),
  );
  const testElectron = requireFromExtension('@vscode/test-electron') as {
    runTests: RunVSCodeTests;
  };
  return testElectron.runTests;
}

function createLaunchArguments(
  workspacePath: string,
  userDataPath: string,
  extensionsPath: string,
): string[] {
  return [
    workspacePath,
    '--user-data-dir',
    userDataPath,
    '--extensions-dir',
    extensionsPath,
    '--use-inmemory-secretstorage',
    ...(process.platform === 'darwin' ? ['--use-mock-keychain'] : []),
    '--sync',
    'off',
    '--disable-telemetry',
    '--disable-updates',
    '--disable-workspace-trust',
    '--disable-extensions',
    '--skip-welcome',
    '--skip-release-notes',
  ];
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export async function launchPerfSession(
  options: LaunchPerfSessionOptions,
  dependencies: LaunchPerfSessionDependencies = {},
): Promise<PerfSmokeResult> {
  if (options.fixture === 'self' && options.symbols === true) {
    throw new Error('--symbols is not supported for the self performance fixture');
  }
  const ownsEnvironment = options.environment === undefined;
  const environment = options.environment ?? await createPerfRunEnvironment({
    fixture: options.fixture,
    repoRoot: options.repoRoot,
    symbols: options.symbols,
  });
  if (
    environment.fixture !== options.fixture
    || environment.symbols !== (options.symbols === true)
  ) {
    if (ownsEnvironment) await environment.dispose();
    throw new Error('Performance run environment does not match the requested fixture variant');
  }
  const originalHome = process.env.HOME;
  const scenario = options.scenario ?? 'cold-open';
  const idleCpuReadyPath = scenario === 'idle-watch'
    ? `${options.resultPath}.idle-ready`
    : undefined;
  const idleCpuDonePath = scenario === 'idle-watch'
    ? `${options.resultPath}.idle-done`
    : undefined;

  try {
    await Promise.all([
      mkdir(dirname(options.resultPath), { recursive: true }),
      rm(options.resultPath, { force: true }),
      ...(idleCpuReadyPath ? [rm(idleCpuReadyPath, { force: true })] : []),
      ...(idleCpuDonePath ? [rm(idleCpuDonePath, { force: true })] : []),
    ]);

    process.env.HOME = environment.homePath;
    const runTests = dependencies.runTests ?? loadRunTests(options.repoRoot);
    const testRun = runTests({
      extensionDevelopmentPath: options.repoRoot,
      extensionTestsPath: join(
        options.repoRoot,
        'packages/extension/dist-e2e/extension/src/e2e/perf/run',
      ),
      extensionTestsEnv: {
        CODEGRAPHY_PERF: '1',
        CODEGRAPHY_PERF_FIXTURE: options.fixture,
        CODEGRAPHY_PERF_RESULT_PATH: options.resultPath,
        CODEGRAPHY_PERF_RUN_ID: options.runId,
        CODEGRAPHY_PERF_SCENARIO: scenario,
        CODEGRAPHY_PERF_SYMBOLS: options.symbols === true ? '1' : '0',
        ...(idleCpuReadyPath
          ? { CODEGRAPHY_PERF_IDLE_READY_PATH: idleCpuReadyPath }
          : {}),
        ...(idleCpuDonePath
          ? { CODEGRAPHY_PERF_IDLE_DONE_PATH: idleCpuDonePath }
          : {}),
        HOME: environment.homePath,
      },
      launchArgs: createLaunchArguments(
        environment.workspacePath,
        environment.userDataPath,
        environment.extensionsPath,
      ),
      version: options.vscodeVersion,
    });
    const idleCpuSample = idleCpuReadyPath
      ? (async () => {
          try {
            const waitForIdleReady = dependencies.waitForIdleReady ?? waitForIdleCpuReady;
            await Promise.race([
              waitForIdleReady(idleCpuReadyPath),
              testRun.then((exitCode) => {
                throw new Error(
                  `VS Code performance session exited with code ${exitCode} before idle CPU sampling began`,
                );
              }),
            ]);
            const sampleIdleCpu = dependencies.sampleIdleCpu ?? sampleVsCodeIdleCpu;
            return await sampleIdleCpu({
              durationMs: 60_000,
              identity: {
                userDataPath: environment.userDataPath,
                workspacePath: environment.workspacePath,
              },
            });
          } finally {
            if (idleCpuDonePath) {
              await writeFile(idleCpuDonePath, `${options.runId}\n`, 'utf8');
            }
          }
        })()
      : Promise.resolve(undefined);
    const [testOutcome, sampleOutcome] = await Promise.allSettled([
      testRun,
      idleCpuSample,
    ]);
    if (testOutcome.status === 'rejected') {
      throw asError(testOutcome.reason);
    }
    const exitCode = testOutcome.value;
    if (exitCode !== 0) {
      throw new Error(`VS Code performance session exited with code ${exitCode}`);
    }
    if (sampleOutcome.status === 'rejected') {
      throw asError(sampleOutcome.reason);
    }
    const idleCpu = sampleOutcome.value;

    const baseResult = perfSmokeResultSchema.parse(
      JSON.parse(await readFile(options.resultPath, 'utf8')),
    );
    if (baseResult.scenario !== scenario) {
      throw new Error(
        `Performance result scenario ${baseResult.scenario} does not match requested scenario ${scenario}`,
      );
    }
    const result = idleCpu
      ? perfSmokeResultSchema.parse({
          ...baseResult,
          metrics: [
            ...baseResult.metrics,
            { metric: 'idleCpuPct', unit: 'percent', value: idleCpu.idleCpuPct },
          ],
        })
      : baseResult;
    if (idleCpu) {
      await writeFile(options.resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    }
    return result;
  } finally {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    if (ownsEnvironment) {
      await environment.dispose();
    }
    if (idleCpuReadyPath) {
      await rm(idleCpuReadyPath, { force: true });
    }
    if (idleCpuDonePath) {
      await rm(idleCpuDonePath, { force: true });
    }
  }
}
