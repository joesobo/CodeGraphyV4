export function asyncWaitPressure(asyncWaitCount: number): number {
  return Math.min(4, asyncWaitCount);
}

export function concurrencyPressure(concurrencyCount: number): number {
  return Math.min(2, concurrencyCount);
}

export function environmentMutationPressure(envMutationCount: number, fakeTimerCount: number): number {
  return Math.min(3, envMutationCount + fakeTimerCount);
}

export function snapshotPressure(snapshotCount: number): number {
  return Math.max(0, Math.min(4, snapshotCount - 1));
}

export function vitestOperationalPressure(
  snapshotCount: number,
  asyncWaitCount: number,
  fakeTimerCount: number,
  envMutationCount: number,
  concurrencyCount: number
): number {
  return snapshotPressure(snapshotCount) +
    asyncWaitPressure(asyncWaitCount) +
    environmentMutationPressure(envMutationCount, fakeTimerCount) +
    concurrencyPressure(concurrencyCount);
}
