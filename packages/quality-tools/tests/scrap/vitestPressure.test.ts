import { describe, expect, it } from 'vitest';
import {
  asyncWaitPressure,
  concurrencyPressure,
  environmentMutationPressure,
  moduleMockPressure,
  snapshotPressure,
  vitestOperationalPressure
} from '../../src/scrap/vitestPressure';

describe('vitestPressure', () => {
  it('caps snapshot pressure after the first snapshot', () => {
    expect(snapshotPressure(0)).toBe(0);
    expect(snapshotPressure(1)).toBe(0);
    expect(snapshotPressure(3)).toBe(2);
    expect(snapshotPressure(9)).toBe(4);
  });

  it('caps async waits, concurrency, and env mutation pressure', () => {
    expect(asyncWaitPressure(0)).toBe(0);
    expect(asyncWaitPressure(3)).toBe(3);
    expect(asyncWaitPressure(10)).toBe(4);
    expect(concurrencyPressure(0)).toBe(0);
    expect(concurrencyPressure(2)).toBe(2);
    expect(concurrencyPressure(10)).toBe(2);
    expect(environmentMutationPressure(1, 0)).toBe(1);
    expect(environmentMutationPressure(2, 2)).toBe(3);
    expect(moduleMockPressure(1)).toBe(1);
    expect(moduleMockPressure(10)).toBe(3);
  });

  it('combines the Vitest operational pressures', () => {
    expect(vitestOperationalPressure(3, 2, 1, 1, 2, 2)).toBe(10);
  });
});
