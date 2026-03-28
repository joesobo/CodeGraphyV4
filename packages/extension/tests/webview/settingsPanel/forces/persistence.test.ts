import { describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../src/shared/contracts';
import {
  clearPhysicsTimerMap,
  flushPendingPhysicsValue,
  schedulePendingPhysicsValue,
  type PendingPhysicsMap,
  type PhysicsTimerMap,
} from '../../../../src/webview/components/settingsPanel/forces/persistence';

describe('settingsPanel forces persistence', () => {
  it('ignores undefined timer entries when clearing a timeout map', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const timers: PhysicsTimerMap = {
      repelForce: setTimeout(() => undefined, 1000),
      centerForce: undefined,
    };

    clearPhysicsTimerMap(timers);

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('flushes the pending value even when no timer exists', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const pendingValues: PendingPhysicsMap = { repelForce: 6 };
    const timers: PhysicsTimerMap = {};
    const flushed: Array<{ key: keyof IPhysicsSettings; value: number }> = [];

    flushPendingPhysicsValue(pendingValues, timers, 'repelForce', (key, value) => {
      flushed.push({ key, value });
    });

    expect(clearTimeoutSpy).not.toHaveBeenCalled();
    expect(flushed).toEqual([{ key: 'repelForce', value: 6 }]);
    vi.useRealTimers();
  });

  it('clears the timer when flushing a pending physics value', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const pendingValues: PendingPhysicsMap = { repelForce: 6 };
    const timers: PhysicsTimerMap = {
      repelForce: setTimeout(() => undefined, 1000),
    };

    flushPendingPhysicsValue(pendingValues, timers, 'repelForce', () => undefined);

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(pendingValues).toEqual({});
    expect(timers).toEqual({});
    vi.useRealTimers();
  });

  it('does not clear a timer before the first scheduled value', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const pendingValues: PendingPhysicsMap = {};
    const timers: PhysicsTimerMap = {};

    schedulePendingPhysicsValue(
      pendingValues,
      timers,
      'repelForce',
      6,
      350,
      () => undefined,
    );

    expect(clearTimeoutSpy).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('replaces an existing timer so only the latest value is flushed', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const pendingValues: PendingPhysicsMap = {};
    const timers: PhysicsTimerMap = {};
    const flushed: Array<{ key: keyof IPhysicsSettings; value: number }> = [];
    const flush = (key: keyof IPhysicsSettings) =>
      flushPendingPhysicsValue(pendingValues, timers, key, (flushKey, value) => {
        flushed.push({ key: flushKey, value });
      });

    schedulePendingPhysicsValue(pendingValues, timers, 'repelForce', 6, 350, flush);
    schedulePendingPhysicsValue(pendingValues, timers, 'repelForce', 7, 350, flush);
    vi.advanceTimersByTime(350);

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
    expect(flushed).toEqual([{ key: 'repelForce', value: 7 }]);
    vi.useRealTimers();
  });
});
