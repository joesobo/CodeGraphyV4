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
        idleCpuPct: 0.5,
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
    expect(JSON.parse(await readFile(resultPath, 'utf8'))).toEqual(result);
  });
});
