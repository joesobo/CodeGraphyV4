import { describe, expect, it, vi } from 'vitest';
import {
  clearTimeoutMap,
  flushPendingNumber,
  schedulePendingNumber,
  type PendingNumberMap,
  type TimeoutMap,
} from '../../../../src/webview/components/settingsPanel/display/timers';

describe('settingsPanel timers', () => {
  it('does nothing when flushing a key without a pending value', () => {
    const pendingValues: PendingNumberMap<'particleSpeed'> = {};
    const timers: TimeoutMap<'particleSpeed'> = {};
    const flushed: Array<{ key: string; value: number }> = [];

    flushPendingNumber(pendingValues, timers, 'particleSpeed', (key, value) => {
      flushed.push({ key, value });
    });

    expect(flushed).toEqual([]);
  });

  it('clears the timer and emits the pending value when flushing a key', () => {
    vi.useFakeTimers();
    const pendingValues: PendingNumberMap<'particleSpeed'> = { particleSpeed: 0.001 };
    const timers: TimeoutMap<'particleSpeed'> = {
      particleSpeed: setTimeout(() => {
        throw new Error('timer should have been cleared');
      }, 1000),
    };
    const flushed: Array<{ key: string; value: number }> = [];

    flushPendingNumber(pendingValues, timers, 'particleSpeed', (key, value) => {
      flushed.push({ key, value });
    });

    expect(flushed).toEqual([{ key: 'particleSpeed', value: 0.001 }]);
    expect(pendingValues).toEqual({});
    expect(timers).toEqual({});

    vi.advanceTimersByTime(1000);
    vi.useRealTimers();
  });

  it('replaces an existing timer so only the latest value is flushed', () => {
    vi.useFakeTimers();
    const pendingValues: PendingNumberMap<'particleSpeed'> = {};
    const timers: TimeoutMap<'particleSpeed'> = {};
    const flushed: Array<{ key: string; value: number }> = [];
    const flush = (key: 'particleSpeed') =>
      flushPendingNumber(pendingValues, timers, key, (flushKey, value) => {
        flushed.push({ key: flushKey, value });
      });

    schedulePendingNumber(pendingValues, timers, 'particleSpeed', 0.001, 350, flush);
    schedulePendingNumber(pendingValues, timers, 'particleSpeed', 0.0015, 350, flush);

    vi.advanceTimersByTime(350);

    expect(flushed).toEqual([{ key: 'particleSpeed', value: 0.0015 }]);
    vi.useRealTimers();
  });

  it('clears every timer in a timeout map', () => {
    vi.useFakeTimers();
    let firstRan = false;
    let secondRan = false;
    const timers: TimeoutMap<'particleSpeed' | 'particleSize'> = {
      particleSpeed: setTimeout(() => {
        firstRan = true;
      }, 1000),
      particleSize: setTimeout(() => {
        secondRan = true;
      }, 1000),
    };

    clearTimeoutMap(timers);
    vi.advanceTimersByTime(1000);

    expect(firstRan).toBe(false);
    expect(secondRan).toBe(false);
    vi.useRealTimers();
  });
});
