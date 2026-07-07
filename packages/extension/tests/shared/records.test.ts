import { describe, expect, it } from 'vitest';
import { isObjectRecord } from '../../src/shared/records';

describe('shared/records', () => {
  it('accepts non-null object records and rejects arrays and primitives', () => {
    expect(isObjectRecord({ legend: [] })).toBe(true);
    expect(isObjectRecord(new Date('2026-01-01T00:00:00.000Z'))).toBe(true);
    expect(isObjectRecord(null)).toBe(false);
    expect(isObjectRecord(['legend'])).toBe(false);
    expect(isObjectRecord('settings')).toBe(false);
    expect(isObjectRecord(42)).toBe(false);
  });
});
