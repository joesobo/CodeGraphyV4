import type { GraphPhysicsSettings } from '@codegraphy-dev/graph-renderer/visuals';

export type PendingPhysicsMap = Partial<Record<keyof GraphPhysicsSettings, number>>;
export type PhysicsTimerMap = Partial<
  Record<keyof GraphPhysicsSettings, ReturnType<typeof setTimeout>>
>;

export function clearPhysicsTimerMap(timers: PhysicsTimerMap): void {
  for (const timer of Object.values(timers)) {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export function flushPendingPhysicsValue(
  pendingValues: PendingPhysicsMap,
  timers: PhysicsTimerMap,
  key: keyof GraphPhysicsSettings,
  emit: (key: keyof GraphPhysicsSettings, value: number) => void,
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

export function schedulePendingPhysicsValue(
  pendingValues: PendingPhysicsMap,
  timers: PhysicsTimerMap,
  key: keyof GraphPhysicsSettings,
  value: number,
  delayMs: number,
  flush: (key: keyof GraphPhysicsSettings) => void,
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
