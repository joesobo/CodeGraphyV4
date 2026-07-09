import { access, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { launchPerfSession, type RunVSCodeTestsOptions } from './launch';

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
        metrics: [{ metric: 'coldOpenMs', unit: 'ms', value: 20 }],
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
});
