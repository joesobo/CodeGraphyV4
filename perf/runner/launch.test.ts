import { access, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { launchPerfSession, type RunVSCodeTestsOptions } from './launch';
import { createPerfRunEnvironment } from './environment';

async function countTypeScriptFiles(directory: string): Promise<number> {
  const entries = await readdir(directory, { withFileTypes: true });
  const counts = await Promise.all(entries.map((entry) => {
    const entryPath = join(directory, entry.name);
    return entry.isDirectory()
      ? countTypeScriptFiles(entryPath)
      : Promise.resolve(entry.name.endsWith('.ts') ? 1 : 0);
  }));
  return counts.reduce((total, count) => total + count, 0);
}

describe('performance VS Code launcher', () => {
  it('launches an isolated generated workspace', async () => {
    const resultRoot = await mkdtemp(join(tmpdir(), 'codegraphy-perf-result-'));
    onTestFinished(() => rm(resultRoot, { recursive: true, force: true }));
    const resultPath = join(resultRoot, 'small.json');
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    let temporaryRoot: string | undefined;
    const runTests = vi.fn(async (options: RunVSCodeTestsOptions) => {
      const workspacePath = options.launchArgs[0];
      temporaryRoot = dirname(workspacePath);
      await Promise.all([
        access(workspacePath),
        access(options.extensionTestsEnv.HOME),
        access(dirname(options.extensionTestsEnv.CODEGRAPHY_PERF_RESULT_PATH)),
      ]);
      expect(await countTypeScriptFiles(workspacePath)).toBe(100);
      expect(options.extensionDevelopmentPath).toBe(repoRoot);
      expect(options.extensionTestsPath).toContain('dist-e2e/extension/src/e2e/perf/run');
      expect(options.extensionTestsEnv).toMatchObject({
        CODEGRAPHY_PERF: '1',
        CODEGRAPHY_PERF_FIXTURE: 'small',
        CODEGRAPHY_PERF_RUN_ID: 'small-1',
        CODEGRAPHY_PERF_RESULT_PATH: resultPath,
      });
      expect(options.launchArgs).toContain('--disable-extensions');
      if (process.platform === 'darwin') {
        expect(options.launchArgs).toContain('--use-mock-keychain');
      }
      await writeFile(resultPath, JSON.stringify({
        schemaVersion: 1,
        fixture: 'small',
        runId: 'small-1',
        scenario: 'cold-open',
        metrics: [
          { metric: 'graphBuildMs', unit: 'ms', value: 5, dimension: 'cold-analysis' },
          { metric: 'coldOpenMs', unit: 'ms', value: 20 },
        ],
      }));
      return 0;
    });

    const result = await launchPerfSession({
      fixture: 'small',
      repoRoot,
      resultPath,
      runId: 'small-1',
      vscodeVersion: '1.128.0',
    }, { runTests });

    expect(result.metrics).toEqual([
      { metric: 'graphBuildMs', unit: 'ms', value: 5, dimension: 'cold-analysis' },
      { metric: 'coldOpenMs', unit: 'ms', value: 20 },
    ]);
    expect(runTests).toHaveBeenCalledOnce();
    expect(temporaryRoot).toBeDefined();
    if (process.platform === 'darwin') {
      expect(temporaryRoot).toMatch(/^\/tmp\/cgp-/);
    }
    await expect(access(temporaryRoot!)).rejects.toThrow();
    expect(JSON.parse(await readFile(resultPath, 'utf8'))).toEqual(result);
  });

  it('passes a warm-open scenario to the in-window suite', async () => {
    const resultRoot = await mkdtemp(join(tmpdir(), 'codegraphy-perf-warm-'));
    onTestFinished(() => rm(resultRoot, { recursive: true, force: true }));
    const resultPath = join(resultRoot, 'warm.json');
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    const runTests = vi.fn(async (options: RunVSCodeTestsOptions) => {
      expect(options.extensionTestsEnv.CODEGRAPHY_PERF_SCENARIO).toBe('warm-open');
      await writeFile(resultPath, JSON.stringify({
        schemaVersion: 1,
        fixture: 'small',
        runId: 'small-warm-1',
        scenario: 'warm-open',
        metrics: [{ metric: 'warmOpenMs', unit: 'ms', value: 12 }],
      }));
      return 0;
    });

    const result = await launchPerfSession({
      fixture: 'small',
      repoRoot,
      resultPath,
      runId: 'small-warm-1',
      scenario: 'warm-open',
      vscodeVersion: '1.128.0',
    }, { runTests });

    expect(result.metrics[0]?.metric).toBe('warmOpenMs');
  });

  it('reuses a provided workspace for cold and warm launches', async () => {
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    const environment = await createPerfRunEnvironment({ fixture: 'small', repoRoot });
    const resultRoot = await mkdtemp(join(tmpdir(), 'codegraphy-perf-pair-'));
    onTestFinished(async () => {
      await Promise.all([
        environment.dispose(),
        rm(resultRoot, { recursive: true, force: true }),
      ]);
    });
    const markerName = 'warm-cache-marker';
    let launchNumber = 0;
    const runTests = vi.fn(async (options: RunVSCodeTestsOptions) => {
      launchNumber += 1;
      const workspacePath = options.launchArgs[0];
      const markerPath = join(workspacePath, markerName);
      if (launchNumber === 1) {
        await writeFile(markerPath, 'preserved');
      } else {
        expect(await readFile(markerPath, 'utf8')).toBe('preserved');
      }
      const scenario = launchNumber === 1 ? 'cold-open' : 'warm-open';
      const metric = launchNumber === 1 ? 'coldOpenMs' : 'warmOpenMs';
      await writeFile(options.extensionTestsEnv.CODEGRAPHY_PERF_RESULT_PATH, JSON.stringify({
        schemaVersion: 1,
        fixture: 'small',
        runId: `small-${launchNumber}`,
        scenario,
        metrics: [{ metric, unit: 'ms', value: 10 }],
      }));
      return 0;
    });

    await launchPerfSession({
      environment,
      fixture: 'small',
      repoRoot,
      resultPath: join(resultRoot, 'cold.json'),
      runId: 'small-1',
      scenario: 'cold-open',
      vscodeVersion: '1.128.0',
    }, { runTests });
    await launchPerfSession({
      environment,
      fixture: 'small',
      repoRoot,
      resultPath: join(resultRoot, 'warm.json'),
      runId: 'small-2',
      scenario: 'warm-open',
      vscodeVersion: '1.128.0',
    }, { runTests });

    expect(runTests).toHaveBeenCalledTimes(2);
    expect(await readFile(join(environment.workspacePath, markerName), 'utf8')).toBe('preserved');
  });
});
