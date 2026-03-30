import type { IPhysicsSettings } from '../../../../shared/settings/physics';

export type PendingPhysicsMap = Partial<Record<keyof IPhysicsSettings, number>>;
export type PhysicsTimerMap = Partial<
  Record<keyof IPhysicsSettings, ReturnType<typeof setTimeout>>
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
  key: keyof IPhysicsSettings,
  emit: (key: keyof IPhysicsSettings, value: number) => void,
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
  key: keyof IPhysicsSettings,
  value: number,
  delayMs: number,
  flush: (key: keyof IPhysicsSettings) => void,
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
