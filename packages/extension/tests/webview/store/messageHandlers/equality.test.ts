import { describe, expect, it } from 'vitest';
import { arePlainValuesEqual } from '@/webview/store/messageHandlers/equality';

describe('webview/store/messageHandlers/equality', () => {
  it('treats identical primitive values as equal', () => {
    expect(arePlainValuesEqual('alpha', 'alpha')).toBe(true);
    expect(arePlainValuesEqual(42, 42)).toBe(true);
    expect(arePlainValuesEqual(true, true)).toBe(true);
  });

  it('distinguishes primitive values that are not identical', () => {
    expect(arePlainValuesEqual('alpha', 'beta')).toBe(false);
    expect(arePlainValuesEqual(42, 7)).toBe(false);
    expect(arePlainValuesEqual(true, false)).toBe(false);
  });

  it('treats NaN and signed zero with Object.is semantics', () => {
    expect(arePlainValuesEqual(NaN, NaN)).toBe(true);
    expect(arePlainValuesEqual(-0, -0)).toBe(true);
    expect(arePlainValuesEqual(-0, 0)).toBe(false);
  });

  it('compares arrays recursively', () => {
    expect(
      arePlainValuesEqual(
        [1, { label: 'alpha', tags: ['one', 'two'] }],
        [1, { label: 'alpha', tags: ['one', 'two'] }],
      ),
    ).toBe(true);
    expect(
      arePlainValuesEqual(
        [1, { label: 'alpha', tags: ['one', 'two'] }],
        [1, { label: 'alpha', tags: ['one', 'three'] }],
      ),
    ).toBe(false);
  });

  it('compares plain objects independent of key order', () => {
    expect(
      arePlainValuesEqual(
        { label: 'alpha', nested: { count: 1, enabled: true } },
        { nested: { enabled: true, count: 1 }, label: 'alpha' },
      ),
    ).toBe(true);
  });

  it('returns false for objects with different shapes', () => {
    expect(
      arePlainValuesEqual(
        { label: 'alpha', nested: { count: 1 } },
        { label: 'alpha', nested: { count: 1, extra: true } },
      ),
    ).toBe(false);
  });

  it('treats null and undefined as distinct values', () => {
    expect(arePlainValuesEqual(null, null)).toBe(true);
    expect(arePlainValuesEqual(undefined, undefined)).toBe(true);
    expect(arePlainValuesEqual(null, undefined)).toBe(false);
  });
});
