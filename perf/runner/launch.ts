import { createRequire } from 'node:module';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import {
  createPerfRunEnvironment,
  type PerfRunEnvironment,
} from './environment';

export interface RunVSCodeTestsOptions {
  extensionDevelopmentPath: string;
  extensionTestsPath: string;
  extensionTestsEnv: Record<string, string>;
  launchArgs: string[];
  version: string;
}

export type RunVSCodeTests = (options: RunVSCodeTestsOptions) => Promise<number>;

export interface LaunchPerfSessionOptions {
  environment?: PerfRunEnvironment;
  fixture: 'small' | 'medium' | 'large' | 'huge' | 'giant';
  repoRoot: string;
  resultPath: string;
  runId: string;
  scenario?: 'cold-open' | 'warm-open';
  symbols?: boolean;
  vscodeVersion: string;
}

export interface LaunchPerfSessionDependencies {
  runTests?: RunVSCodeTests;
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
  schemaVersion: z.literal(1),
  fixture: z.enum(['small', 'medium', 'large', 'huge', 'giant']),
  runId: z.string().min(1),
  scenario: z.enum(['cold-open', 'warm-open']),
  metrics: z.array(smokeMetricSchema).min(1),
}).superRefine((result, issues) => {
  const expectedMetric = result.scenario === 'cold-open' ? 'coldOpenMs' : 'warmOpenMs';
  if (!result.metrics.some(metric => metric.metric === expectedMetric)) {
    issues.addIssue({
      code: 'custom',
      path: ['metrics'],
      message: `${result.scenario} requires ${expectedMetric}`,
    });
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

export async function launchPerfSession(
  options: LaunchPerfSessionOptions,
  dependencies: LaunchPerfSessionDependencies = {},
): Promise<PerfSmokeResult> {
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

  try {
    await Promise.all([
      mkdir(dirname(options.resultPath), { recursive: true }),
      rm(options.resultPath, { force: true }),
    ]);

    process.env.HOME = environment.homePath;
    const runTests = dependencies.runTests ?? loadRunTests(options.repoRoot);
    const exitCode = await runTests({
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
        CODEGRAPHY_PERF_SCENARIO: options.scenario ?? 'cold-open',
        CODEGRAPHY_PERF_SYMBOLS: options.symbols === true ? '1' : '0',
        HOME: environment.homePath,
      },
      launchArgs: createLaunchArguments(
        environment.workspacePath,
        environment.userDataPath,
        environment.extensionsPath,
      ),
      version: options.vscodeVersion,
    });
    if (exitCode !== 0) {
      throw new Error(`VS Code performance session exited with code ${exitCode}`);
    }

    return perfSmokeResultSchema.parse(
      JSON.parse(await readFile(options.resultPath, 'utf8')),
    );
  } finally {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    if (ownsEnvironment) {
      await environment.dispose();
    }
  }
}
