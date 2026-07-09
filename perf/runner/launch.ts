import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { generateFixture } from '../fixtures/generate';

export interface RunVSCodeTestsOptions {
  extensionDevelopmentPath: string;
  extensionTestsPath: string;
  extensionTestsEnv: Record<string, string>;
  launchArgs: string[];
  version: string;
}

export type RunVSCodeTests = (options: RunVSCodeTestsOptions) => Promise<number>;

export interface LaunchPerfSessionOptions {
  fixture: 'small' | 'medium' | 'large' | 'huge' | 'giant';
  repoRoot: string;
  resultPath: string;
  runId: string;
  symbols?: boolean;
  vscodeVersion: string;
}

export interface LaunchPerfSessionDependencies {
  runTests?: RunVSCodeTests;
}

const smokeMetricSchema = z.strictObject({
  metric: z.literal('coldOpenMs'),
  unit: z.literal('ms'),
  value: z.number().finite().nonnegative(),
});

const perfSmokeResultSchema = z.strictObject({
  schemaVersion: z.literal(1),
  fixture: z.enum(['small', 'medium', 'large', 'huge', 'giant']),
  runId: z.string().min(1),
  scenario: z.literal('cold-open'),
  metrics: z.array(smokeMetricSchema).min(1),
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
  const temporaryRoot = await mkdtemp(join(
    process.platform === 'darwin' ? '/tmp' : tmpdir(),
    'cgp-',
  ));
  const workspacePath = join(temporaryRoot, 'workspace');
  const profilePath = join(temporaryRoot, 'profile');
  const homePath = join(profilePath, 'home');
  const userDataPath = join(profilePath, 'user-data');
  const extensionsPath = join(profilePath, 'extensions');
  const originalHome = process.env.HOME;

  try {
    await Promise.all([
      generateFixture({
        fixture: options.fixture,
        outputRoot: workspacePath,
        symbols: options.symbols === true,
      }),
      mkdir(homePath, { recursive: true }),
      mkdir(userDataPath, { recursive: true }),
      mkdir(extensionsPath, { recursive: true }),
      mkdir(dirname(options.resultPath), { recursive: true }),
      rm(options.resultPath, { force: true }),
    ]);

    process.env.HOME = homePath;
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
        CODEGRAPHY_PERF_SYMBOLS: options.symbols === true ? '1' : '0',
        HOME: homePath,
      },
      launchArgs: createLaunchArguments(workspacePath, userDataPath, extensionsPath),
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
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}
