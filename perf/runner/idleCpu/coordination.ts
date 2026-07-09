import { access } from 'node:fs/promises';
import { setTimeout as wait } from 'node:timers/promises';

export interface IdleCpuCoordinationDependencies {
  markerExists(path: string): Promise<boolean>;
  now(): number;
  sleep(durationMs: number): Promise<void>;
}

export interface IdleCpuCoordinationOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
}

const defaultDependencies: IdleCpuCoordinationDependencies = {
  markerExists: async (path) => {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  },
  now: () => performance.now(),
  sleep: async (durationMs) => { await wait(durationMs); },
};

export async function waitForIdleCpuReady(
  markerPath: string,
  dependencies: IdleCpuCoordinationDependencies = defaultDependencies,
  options: IdleCpuCoordinationOptions = {},
): Promise<void> {
  const startedAt = dependencies.now();
  const timeoutMs = options.timeoutMs ?? 180_000;
  const pollIntervalMs = options.pollIntervalMs ?? 50;

  while (!await dependencies.markerExists(markerPath)) {
    if (dependencies.now() - startedAt >= timeoutMs) {
      throw new Error(`Timed out waiting for idle CPU marker ${markerPath}`);
    }
    await dependencies.sleep(pollIntervalMs);
  }
}
