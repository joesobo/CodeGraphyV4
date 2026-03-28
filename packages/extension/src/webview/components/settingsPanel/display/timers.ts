export type TimeoutMap<Key extends string> = Partial<
  Record<Key, ReturnType<typeof setTimeout>>
>;

export type PendingNumberMap<Key extends string> = Partial<Record<Key, number>>;

export function clearTimeoutMap<Key extends string>(timers: TimeoutMap<Key>): void {
  for (const key in timers) {
    const timer = timers[key as Key];
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export function flushPendingNumber<Key extends string>(
  pendingValues: PendingNumberMap<Key>,
  timers: TimeoutMap<Key>,
  key: Key,
  emit: (key: Key, value: number) => void
): void {
  const pendingValue = pendingValues[key];
  if (pendingValue === undefined) {
    return;
  }

  const timer = timers[key];
  if (timer) {
    clearTimeout(timer);
    delete timers[key];
  }

  delete pendingValues[key];
  emit(key, pendingValue);
}

export function schedulePendingNumber<Key extends string>(
  pendingValues: PendingNumberMap<Key>,
  timers: TimeoutMap<Key>,
  key: Key,
  value: number,
  delayMs: number,
  flush: (key: Key) => void
): void {
  pendingValues[key] = value;

  const existingTimer = timers[key];
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  timers[key] = setTimeout(() => {
    flush(key);
  }, delayMs);
}
