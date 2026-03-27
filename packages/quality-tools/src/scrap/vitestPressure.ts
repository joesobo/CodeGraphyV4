export function asyncWaitPressure(asyncWaitCount: number): number {
  return Math.min(4, asyncWaitCount);
}

export function concurrencyPressure(concurrencyCount: number): number {
  return Math.min(2, concurrencyCount);
}

export function environmentMutationPressure(envMutationCount: number, fakeTimerCount: number): number {
  return Math.min(3, envMutationCount + fakeTimerCount);
}

export function moduleMockPressure(moduleMockCount: number): number {
  return Math.min(3, moduleMockCount);
}

export function snapshotPressure(snapshotCount: number): number {
  return Math.max(0, Math.min(4, snapshotCount - 1));
}

export function rtlQueryPressure(
  rtlRenderCount: number,
  rtlQueryCount: number,
  rtlMutationCount: number
): number {
  if (rtlRenderCount === 0 || rtlMutationCount > 0 || rtlQueryCount < 3) {
    return 0;
  }

  return Math.min(3, rtlQueryCount - 2);
}

export function vitestOperationalPressure(
  snapshotCount: number,
  asyncWaitCount: number,
  fakeTimerCount: number,
  envMutationCount: number,
  concurrencyCount: number,
  moduleMockCount = 0,
  rtlRenderCount = 0,
  rtlQueryCount = 0,
  rtlMutationCount = 0
): number {
  return snapshotPressure(snapshotCount) +
    asyncWaitPressure(asyncWaitCount) +
    environmentMutationPressure(envMutationCount, fakeTimerCount) +
    concurrencyPressure(concurrencyCount) +
    moduleMockPressure(moduleMockCount) +
    rtlQueryPressure(rtlRenderCount, rtlQueryCount, rtlMutationCount);
}
