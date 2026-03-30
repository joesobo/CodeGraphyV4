import { describe, expect, it } from 'vitest';
import { calculateCrap } from '../../../src/crap/analysis/calculate';

describe('calculateCrap', () => {
  it('increases sharply as coverage drops', () => {
    expect(calculateCrap(4, 100)).toBe(4);
    expect(calculateCrap(4, 50)).toBe(6);
  });

  it('matches the CRAP formula for partially covered code', () => {
    expect(calculateCrap(10, 20)).toBeCloseTo(61.2, 5);
  });
});
