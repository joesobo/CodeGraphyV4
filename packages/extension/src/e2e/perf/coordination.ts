import { access } from 'node:fs/promises';
import { setTimeout as wait } from 'node:timers/promises';

interface IdleCpuDoneDependencies {
  markerExists(path: string): Promise<boolean>;
  now(): number;
  sleep(durationMs: number): Promise<void>;
}

interface IdleCpuDoneOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
}

const defaultDependencies: IdleCpuDoneDependencies = {
  markerExists: async (path) => {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  },
  now: () => performance.now(),
  sleep: async durationMs => { await wait(durationMs); },
};

export async function waitForIdleCpuDone(
  markerPath: string,
  dependencies: IdleCpuDoneDependencies = defaultDependencies,
  options: IdleCpuDoneOptions = {},
): Promise<void> {
  const startedAt = dependencies.now();
  const timeoutMs = options.timeoutMs ?? 30_000;
  const pollIntervalMs = options.pollIntervalMs ?? 50;

  while (!await dependencies.markerExists(markerPath)) {
    if (dependencies.now() - startedAt >= timeoutMs) {
      throw new Error(`Timed out waiting for idle CPU completion marker ${markerPath}`);
    }
    await dependencies.sleep(pollIntervalMs);
  }
}
