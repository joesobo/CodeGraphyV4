import { describe, expect, it, vi } from 'vitest';

import type { ProcessEntry } from './discovery';
import {
  sampleVsCodeIdleCpu,
  type IdleCpuSampleDependencies,
} from './sample';

const identity = {
  userDataPath: '/tmp/cgp-session/profile/user-data',
  workspacePath: '/tmp/cgp-session/workspace',
};

function sessionProcesses(): ProcessEntry[] {
  return [
    {
      command: `/Applications/Code ${identity.workspacePath} `
        + `--user-data-dir ${identity.userDataPath}`,
      name: 'Code',
      pid: 100,
      ppid: 1,
    },
    {
      command: '/Applications/Code Helper --type=renderer',
      name: 'Code Helper',
      pid: 101,
      ppid: 100,
    },
    {
      command: 'node extensionHostProcess.js',
      name: 'node',
      pid: 102,
      ppid: 100,
    },
  ];
}

function setupDependencies(
  samples: Array<Record<string, { cpu: number }>> = [
    { 101: { cpu: 0 }, 102: { cpu: 0 } },
    { 101: { cpu: 0.75 }, 102: { cpu: 0.25 } },
  ],
): IdleCpuSampleDependencies & {
  clear: ReturnType<typeof vi.fn>;
  sample: ReturnType<typeof vi.fn>;
  sleep: ReturnType<typeof vi.fn>;
} {
  let now = 1_000;
  const clear = vi.fn();
  const sample = vi.fn();
  for (const value of samples) sample.mockResolvedValueOnce(value);
  const sleep = vi.fn(async (durationMs: number) => {
    now += durationMs;
  });

  return {
    clear,
    clock: {
      now: () => now,
      sleep,
    },
    discoverProcesses: vi.fn(async () => sessionProcesses()),
    sample,
    sampler: { clear, sample },
    sleep,
  };
}

describe('idle CPU sampling', () => {
  it('samples aggregate renderer and extension-host CPU across the idle duration', async () => {
    const dependencies = setupDependencies();

    await expect(sampleVsCodeIdleCpu({
      durationMs: 60_000,
      identity,
      sampleIntervalMs: 60_000,
    }, dependencies)).resolves.toEqual({
      extensionHostPids: [102],
      idleCpuPct: 1,
      rendererPids: [101],
      targetPids: [101, 102],
    });
    expect(dependencies.sample).toHaveBeenNthCalledWith(1, [101, 102]);
    expect(dependencies.sample).toHaveBeenNthCalledWith(2, [101, 102]);
    expect(dependencies.sleep).toHaveBeenCalledOnce();
    expect(dependencies.sleep).toHaveBeenCalledWith(60_000);
    expect(dependencies.clear).toHaveBeenCalledOnce();
  });

  it('samples sequential intervals and weights a shorter final interval', async () => {
    const dependencies = setupDependencies([
      { 101: { cpu: 0 }, 102: { cpu: 0 } },
      { 101: { cpu: 0.5 }, 102: { cpu: 0.5 } },
      { 101: { cpu: 1 }, 102: { cpu: 2 } },
      { 101: { cpu: 2 }, 102: { cpu: 3 } },
    ]);

    const result = await sampleVsCodeIdleCpu({
      durationMs: 2_500,
      identity,
      sampleIntervalMs: 1_000,
    }, dependencies);

    expect(dependencies.sleep.mock.calls).toEqual([[1_000], [1_000], [500]]);
    expect(dependencies.sample).toHaveBeenCalledTimes(4);
    expect(result.idleCpuPct).toBe(2.6);
  });

  it('normalizes negative sampler noise to a nonnegative percentage', async () => {
    const dependencies = setupDependencies([
      { 101: { cpu: 0 }, 102: { cpu: 0 } },
      { 101: { cpu: -0.1 }, 102: { cpu: 0.25 } },
    ]);

    const result = await sampleVsCodeIdleCpu({
      durationMs: 1_000,
      identity,
    }, dependencies);

    expect(result.idleCpuPct).toBe(0.25);
  });

  it('clears sampler state when sampling fails', async () => {
    const dependencies = setupDependencies([
      { 101: { cpu: 0 }, 102: { cpu: 0 } },
    ]);
    dependencies.sample.mockRejectedValueOnce(new Error('process exited'));

    await expect(sampleVsCodeIdleCpu({
      durationMs: 1_000,
      identity,
    }, dependencies)).rejects.toThrow('process exited');
    expect(dependencies.clear).toHaveBeenCalledOnce();
  });

  it('clears sampler state when target process discovery fails', async () => {
    const dependencies = setupDependencies();
    dependencies.discoverProcesses = vi.fn(async () => []);

    await expect(sampleVsCodeIdleCpu({
      durationMs: 1_000,
      identity,
    }, dependencies)).rejects.toThrow(
      `Unable to find VS Code launch process for user data ${identity.userDataPath}`,
    );
    expect(dependencies.sample).not.toHaveBeenCalled();
    expect(dependencies.clear).toHaveBeenCalledOnce();
  });

  it('fails clearly when a target process is missing from the final sample', async () => {
    const dependencies = setupDependencies([
      { 101: { cpu: 0 }, 102: { cpu: 0 } },
      { 101: { cpu: 0.5 } },
    ]);

    await expect(sampleVsCodeIdleCpu({
      durationMs: 1_000,
      identity,
    }, dependencies)).rejects.toThrow(
      'Missing CPU statistics for VS Code process 102',
    );
    expect(dependencies.clear).toHaveBeenCalledOnce();
  });
});
