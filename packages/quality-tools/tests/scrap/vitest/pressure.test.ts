import { describe, expect, it } from 'vitest';
import {
  asyncWaitPressure,
  concurrencyPressure,
  environmentMutationPressure,
  moduleMockPressure,
  rtlQueryPressure,
  snapshotPressure,
  vitestOperationalPressure
} from '../../../src/scrap/vitest/pressure';

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

  it('returns zero pressure when rtl render count is zero', () => {
    expect(rtlQueryPressure(0, 5, 0)).toBe(0);
  });

  it('returns zero pressure when rtl mutation count is greater than zero', () => {
    expect(rtlQueryPressure(1, 5, 1)).toBe(0);
  });

  it('returns zero pressure when rtl query count is less than three', () => {
    expect(rtlQueryPressure(1, 2, 0)).toBe(0);
  });

  it('returns zero when rtl render count is zero and rtl mutation count is zero', () => {
    expect(rtlQueryPressure(0, 10, 0)).toBe(0);
  });

  it('returns zero when rtl render count is zero and rtl mutation count is greater than zero', () => {
    expect(rtlQueryPressure(0, 10, 1)).toBe(0);
  });

  it('returns zero when rtl render count is nonzero and rtl mutation count is greater than zero', () => {
    expect(rtlQueryPressure(2, 5, 1)).toBe(0);
  });

  it('calculates pressure based on query count when all conditions pass', () => {
    expect(rtlQueryPressure(1, 3, 0)).toBe(1);
    expect(rtlQueryPressure(1, 4, 0)).toBe(2);
    expect(rtlQueryPressure(1, 5, 0)).toBe(3);
    expect(rtlQueryPressure(1, 10, 0)).toBe(3);
  });

  it('combines the Vitest operational pressures', () => {
    expect(vitestOperationalPressure(3, 2, 1, 1, 2, 2)).toBe(10);
  });

  it('combines operational pressures with rtl queries', () => {
    expect(vitestOperationalPressure(0, 0, 0, 0, 0, 0, 1, 5, 0)).toBe(3);
  });

  it('combines operational pressures with multiple components', () => {
    expect(vitestOperationalPressure(2, 1, 1, 1, 1, 1, 1, 3, 0)).toBe(
      snapshotPressure(2) +
      asyncWaitPressure(1) +
      environmentMutationPressure(1, 1) +
      concurrencyPressure(1) +
      moduleMockPressure(1) +
      rtlQueryPressure(1, 3, 0)
    );
  });

  it('calculates total pressure with snapshots, async, and concurrency', () => {
    const result = vitestOperationalPressure(5, 5, 0, 0, 3, 0, 0, 0, 0);
    expect(result).toBe(4 + 4 + 0 + 2 + 0 + 0);
  });

  it('handles maximum pressures across all components', () => {
    const result = vitestOperationalPressure(10, 10, 5, 5, 10, 5, 1, 10, 0);
    const expected =
      snapshotPressure(10) +
      asyncWaitPressure(10) +
      environmentMutationPressure(5, 5) +
      concurrencyPressure(10) +
      moduleMockPressure(5) +
      rtlQueryPressure(1, 10, 0);
    expect(result).toBe(expected);
  });

  describe('rtlQueryPressure edge cases', () => {
    it('distinguishes between rtlRenderCount === 0 and rtlRenderCount > 0', () => {
      expect(rtlQueryPressure(0, 10, 0)).toBe(0);
      expect(rtlQueryPressure(1, 10, 0)).not.toBe(0);
    });

    it('distinguishes between rtlMutationCount === 0 and rtlMutationCount > 0', () => {
      expect(rtlQueryPressure(1, 10, 0)).not.toBe(0);
      expect(rtlQueryPressure(1, 10, 1)).toBe(0);
    });

    it('distinguishes between rtlQueryCount < 3 and rtlQueryCount >= 3', () => {
      expect(rtlQueryPressure(1, 2, 0)).toBe(0);
      expect(rtlQueryPressure(1, 3, 0)).not.toBe(0);
    });

    it('uses Math.min to cap query pressure at 3', () => {
      expect(rtlQueryPressure(1, 3, 0)).toBe(1);
      expect(rtlQueryPressure(1, 4, 0)).toBe(2);
      expect(rtlQueryPressure(1, 5, 0)).toBe(3);
      expect(rtlQueryPressure(1, 6, 0)).toBe(3);
    });

    it('calculates rtlQueryCount - 2 for the pressure value', () => {
      expect(rtlQueryPressure(1, 3, 0)).toBe(1); // 3 - 2 = 1
      expect(rtlQueryPressure(1, 4, 0)).toBe(2); // 4 - 2 = 2
      expect(rtlQueryPressure(1, 5, 0)).toBe(3); // 5 - 2 = 3
    });

    it('handles all combinations of early return conditions', () => {
      // All conditions false - should calculate pressure
      expect(rtlQueryPressure(1, 5, 0)).toBe(3);

      // rtlRenderCount === 0 - early return
      expect(rtlQueryPressure(0, 5, 0)).toBe(0);

      // rtlMutationCount > 0 - early return
      expect(rtlQueryPressure(1, 5, 1)).toBe(0);

      // rtlQueryCount < 3 - early return
      expect(rtlQueryPressure(1, 2, 0)).toBe(0);
    });
  });

  describe('vitestOperationalPressure component composition', () => {
    it('sums each pressure component correctly', () => {
      const snap = 2;
      const async = 1;
      const env = 2;
      const conc = 1;
      const mock = 1;
      const rtl = 2;

      const result = vitestOperationalPressure(snap, async, 2, env, conc, mock, 1, rtl, 0);
      const expected =
        snapshotPressure(snap) +
        asyncWaitPressure(async) +
        environmentMutationPressure(env, 2) +
        concurrencyPressure(conc) +
        moduleMockPressure(mock) +
        rtlQueryPressure(1, rtl, 0);
      expect(result).toBe(expected);
    });

    it('includes each component in the final sum', () => {
      // Test that removing any component would change the result
      const base = vitestOperationalPressure(2, 2, 2, 2, 2, 2, 1, 5, 0);

      // Each variation reduces a different component
      expect(vitestOperationalPressure(0, 2, 2, 2, 2, 2, 1, 5, 0)).not.toBe(base);
      expect(vitestOperationalPressure(2, 0, 2, 2, 2, 2, 1, 5, 0)).not.toBe(base);
      expect(vitestOperationalPressure(2, 2, 0, 2, 2, 2, 1, 5, 0)).not.toBe(base);
      expect(vitestOperationalPressure(2, 2, 2, 0, 2, 2, 1, 5, 0)).not.toBe(base);
      expect(vitestOperationalPressure(2, 2, 2, 2, 0, 2, 1, 5, 0)).not.toBe(base);
      expect(vitestOperationalPressure(2, 2, 2, 2, 2, 0, 1, 5, 0)).not.toBe(base);
      expect(vitestOperationalPressure(2, 2, 2, 2, 2, 2, 0, 5, 0)).not.toBe(base);
      expect(vitestOperationalPressure(2, 2, 2, 2, 2, 2, 1, 2, 0)).not.toBe(base);
    });
  });
});
