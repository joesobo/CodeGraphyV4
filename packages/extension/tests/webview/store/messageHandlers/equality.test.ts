import { afterEach, describe, expect, it, vi } from 'vitest';
import { arePlainValuesEqual } from '@/webview/store/messageHandlers/equality';

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('@/webview/store/messageHandlers/equality/isNumberPair');
  vi.doUnmock('@/webview/store/messageHandlers/equality/numberEquality');
  vi.doUnmock('@/webview/store/messageHandlers/equality/plainEquality');
});

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

  it('routes number pairs through numeric comparison semantics', () => {
    expect(arePlainValuesEqual(Number.NaN, Number.NaN)).toBe(true);
    expect(arePlainValuesEqual(1, 2)).toBe(false);
  });

  it('treats mixed primitive and object values as unequal', () => {
    expect(arePlainValuesEqual(1, { value: 1 })).toBe(false);
    expect(arePlainValuesEqual('1', [1])).toBe(false);
  });

  it('delegates number pairs to numeric equality', async () => {
    const areNumberValuesEqual = vi.fn(() => true);
    const arePlainObjectValuesEqual = vi.fn(() => false);

    vi.doMock('@/webview/store/messageHandlers/equality/isNumberPair', () => ({
      isNumberPair: () => true,
    }));
    vi.doMock('@/webview/store/messageHandlers/equality/numberEquality', () => ({
      areNumberValuesEqual,
    }));
    vi.doMock('@/webview/store/messageHandlers/equality/plainEquality', () => ({
      arePlainObjectValuesEqual,
    }));

    const { arePlainValuesEqual: delegatedEquality } = await import(
      '@/webview/store/messageHandlers/equality'
    );

    expect(delegatedEquality(1, 2)).toBe(true);
    expect(areNumberValuesEqual).toHaveBeenCalledWith(1, 2);
    expect(arePlainObjectValuesEqual).not.toHaveBeenCalled();
  });

  it('delegates non-number values to plain equality', async () => {
    const areNumberValuesEqual = vi.fn(() => false);
    const arePlainObjectValuesEqual = vi.fn(() => true);

    vi.doMock('@/webview/store/messageHandlers/equality/isNumberPair', () => ({
      isNumberPair: () => false,
    }));
    vi.doMock('@/webview/store/messageHandlers/equality/numberEquality', () => ({
      areNumberValuesEqual,
    }));
    vi.doMock('@/webview/store/messageHandlers/equality/plainEquality', () => ({
      arePlainObjectValuesEqual,
    }));

    const { arePlainValuesEqual: delegatedEquality } = await import(
      '@/webview/store/messageHandlers/equality'
    );

    const value = { label: 'alpha' };
    expect(delegatedEquality(value, value)).toBe(true);
    expect(arePlainObjectValuesEqual).toHaveBeenCalledWith(value, value);
    expect(areNumberValuesEqual).not.toHaveBeenCalled();
  });
});
