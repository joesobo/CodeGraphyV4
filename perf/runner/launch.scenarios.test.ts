import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import {
  launchPerfSession,
  type RunVSCodeTestsOptions,
} from './launch';

describe('performance VS Code scenario launcher', () => {
  it('passes a file-operation scenario to the in-window command', async () => {
    const resultRoot = await mkdtemp(join(tmpdir(), 'codegraphy-perf-rename-'));
    onTestFinished(() => rm(resultRoot, { recursive: true, force: true }));
    const resultPath = join(resultRoot, 'rename.json');
    const runTests = vi.fn(async (options: RunVSCodeTestsOptions) => {
      expect(options.extensionTestsEnv.CODEGRAPHY_PERF_SCENARIO).toBe('rename');
      await writeFile(resultPath, JSON.stringify({
        schemaVersion: 1,
        fixture: 'small',
        runId: 'small-rename-1',
        scenario: 'rename',
        comparison: {
          codeGraphyRevealMs: 7,
          explorer: { explorerRenameMs: 11, explorerRevealMs: 5 },
        },
        metrics: [{
          dimension: 'small',
          metric: 'fileOpRoundtripMs',
          operationId: 'small-rename-1:rename:small:0',
          unit: 'ms',
          value: 15,
        }],
      }));
      return 0;
    });

    const result = await launchPerfSession({
      fixture: 'small',
      repoRoot: resolve('.'),
      resultPath,
      runId: 'small-rename-1',
      scenario: 'rename',
      vscodeVersion: '1.128.0',
    }, { runTests });

    expect(result.scenario).toBe('rename');
    expect(result.comparison).toEqual({
      codeGraphyRevealMs: 7,
      explorer: { explorerRenameMs: 11, explorerRevealMs: 5 },
    });
  });

  it('rejects a strict comparison payload from another scenario', async () => {
    const resultRoot = await mkdtemp(join(tmpdir(), 'codegraphy-perf-comparison-'));
    onTestFinished(() => rm(resultRoot, { recursive: true, force: true }));
    const resultPath = join(resultRoot, 'create.json');
    const runTests = vi.fn(async () => {
      await writeFile(resultPath, JSON.stringify({
        schemaVersion: 1,
        fixture: 'small',
        runId: 'small-create-1',
        scenario: 'create',
        comparison: {
          codeGraphyRevealMs: 7,
          explorer: { explorerRenameMs: 11, explorerRevealMs: 5 },
        },
        metrics: [{ metric: 'fileOpRoundtripMs', unit: 'ms', value: 15 }],
      }));
      return 0;
    });

    await expect(launchPerfSession({
      fixture: 'small',
      repoRoot: resolve('.'),
      resultPath,
      runId: 'small-create-1',
      scenario: 'create',
      vscodeVersion: '1.128.0',
    }, { runTests })).rejects.toThrow();
  });

  it('rejects a result whose scenario differs from the launch request', async () => {
    const resultRoot = await mkdtemp(join(tmpdir(), 'codegraphy-perf-mismatch-'));
    onTestFinished(() => rm(resultRoot, { recursive: true, force: true }));
    const resultPath = join(resultRoot, 'mismatch.json');
    const runTests = vi.fn(async () => {
      await writeFile(resultPath, JSON.stringify({
        schemaVersion: 1,
        fixture: 'small',
        runId: 'small-rename-1',
        scenario: 'create',
        metrics: [{ metric: 'fileOpRoundtripMs', unit: 'ms', value: 15 }],
      }));
      return 0;
    });

    await expect(launchPerfSession({
      fixture: 'small',
      repoRoot: resolve('.'),
      resultPath,
      runId: 'small-rename-1',
      scenario: 'rename',
      vscodeVersion: '1.128.0',
    }, { runTests })).rejects.toThrow('does not match requested scenario rename');
  });

  it('samples idle CPU while the isolated VS Code session is running', async () => {
    const resultRoot = await mkdtemp(join(tmpdir(), 'codegraphy-perf-idle-'));
    onTestFinished(() => rm(resultRoot, { recursive: true, force: true }));
    const resultPath = join(resultRoot, 'idle.json');
    let testCompleted = false;
    const runTests = vi.fn(async (options: RunVSCodeTestsOptions) => {
      expect(options.extensionTestsEnv.CODEGRAPHY_PERF_IDLE_READY_PATH)
        .toBe(`${resultPath}.idle-ready`);
      expect(options.extensionTestsEnv.CODEGRAPHY_PERF_IDLE_DONE_PATH)
        .toBe(`${resultPath}.idle-done`);
      await writeFile(resultPath, JSON.stringify({
        schemaVersion: 1,
        fixture: 'small',
        runId: 'small-idle-1',
        scenario: 'idle-watch',
        metrics: [{ metric: 'simTicksAfterSettle', unit: 'count', value: 0 }],
      }));
      await new Promise<void>(resolve => { setImmediate(resolve); });
      testCompleted = true;
      return 0;
    });
    const sampleIdleCpu = vi.fn(async () => {
      expect(testCompleted).toBe(false);
      return {
        extensionHostPids: [102],
        extensionHostIdleCpuPct: 0.2,
        idleCpuPct: 0.5,
        rendererIdleCpuPct: 0.3,
        rendererPids: [101],
        targetPids: [101, 102],
      };
    });
    const waitForIdleReady = vi.fn(async () => {});

    const result = await launchPerfSession({
      fixture: 'small',
      repoRoot: resolve('.'),
      resultPath,
      runId: 'small-idle-1',
      scenario: 'idle-watch',
      vscodeVersion: '1.128.0',
    }, { runTests, sampleIdleCpu, waitForIdleReady });

    expect(waitForIdleReady).toHaveBeenCalledWith(`${resultPath}.idle-ready`);
    expect(sampleIdleCpu).toHaveBeenCalledWith(expect.objectContaining({
      durationMs: 60_000,
    }));
    expect(result.metrics).toContainEqual({
      metric: 'idleCpuPct',
      unit: 'percent',
      value: 0.5,
    });
    expect(result.metrics).toContainEqual({
      dimension: 'renderer',
      metric: 'idleCpuPct',
      unit: 'percent',
      value: 0.3,
    });
    expect(result.metrics).toContainEqual({
      dimension: 'extension-host',
      metric: 'idleCpuPct',
      unit: 'percent',
      value: 0.2,
    });
    expect(JSON.parse(await readFile(resultPath, 'utf8'))).toEqual(result);
  });

  it('waits for the VS Code test run before cleaning up after a sampler failure', async () => {
    const resultRoot = await mkdtemp(join(tmpdir(), 'codegraphy-perf-idle-failure-'));
    onTestFinished(() => rm(resultRoot, { recursive: true, force: true }));
    const resultPath = join(resultRoot, 'idle.json');
    const markerPath = `${resultPath}.idle-ready`;
    const doneMarkerPath = `${resultPath}.idle-done`;
    let finishTest: ((exitCode: number) => void) | undefined;
    const runTests = vi.fn(() => new Promise<number>((resolve) => {
      finishTest = resolve;
    }));
    const waitForIdleReady = vi.fn(async (path: string) => {
      await writeFile(path, 'run-idle-failure\n', 'utf8');
    });
    const sampleIdleCpu = vi.fn(async () => {
      throw new Error('idle sampler failed');
    });
    const launch = launchPerfSession({
      environment: {
        dispose: vi.fn(async () => {}),
        extensionsPath: resultRoot,
        fixture: 'small',
        homePath: resultRoot,
        rootPath: resultRoot,
        symbols: false,
        userDataPath: resultRoot,
        workspacePath: resultRoot,
      },
      fixture: 'small',
      repoRoot: resolve('.'),
      resultPath,
      runId: 'run-idle-failure',
      scenario: 'idle-watch',
      vscodeVersion: '1.128.0',
    }, { runTests, sampleIdleCpu, waitForIdleReady });
    let settled = false;
    const observed = launch.then(
      value => ({ value }),
      (error: unknown) => ({ error }),
    ).finally(() => { settled = true; });

    await vi.waitFor(() => expect(sampleIdleCpu).toHaveBeenCalledOnce());
    await new Promise<void>(resolveImmediate => { setImmediate(resolveImmediate); });

    expect(settled).toBe(false);
    await expect(readFile(markerPath, 'utf8')).resolves.toBe('run-idle-failure\n');
    await expect(readFile(doneMarkerPath, 'utf8')).resolves.toBe('run-idle-failure\n');

    finishTest?.(0);
    const outcome = await observed;
    expect('error' in outcome ? outcome.error : undefined).toEqual(
      expect.objectContaining({ message: 'idle sampler failed' }),
    );
    await expect(readFile(markerPath, 'utf8')).rejects.toThrow();
    await expect(readFile(doneMarkerPath, 'utf8')).rejects.toThrow();
  });
});
