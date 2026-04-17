import { describe, expect, it } from 'vitest';
import { arePlainObjectValuesEqual } from '../../../../../src/webview/store/messageHandlers/equality/structures';

describe('webview/store/messageHandlers/equality/structures', () => {
  it('compares nested objects and arrays deeply', () => {
    expect(
      arePlainObjectValuesEqual(
        [1, { label: 'alpha', tags: ['one', 'two'] }],
        [1, { label: 'alpha', tags: ['one', 'two'] }],
      ),
    ).toBe(true);
    expect(
      arePlainObjectValuesEqual(
        [1, { label: 'alpha', tags: ['one', 'two'] }],
        [1, { label: 'alpha', tags: ['one', 'three'] }],
      ),
    ).toBe(false);
  });

  it('handles primitives, nulls, and mismatched container shapes', () => {
    expect(arePlainObjectValuesEqual('alpha', 'alpha')).toBe(true);
    expect(arePlainObjectValuesEqual(null, null)).toBe(true);
    expect(arePlainObjectValuesEqual({ value: 1 }, ['value', 1])).toBe(false);
    expect(arePlainObjectValuesEqual({ value: 1 }, { value: 2 })).toBe(false);
  });
});
