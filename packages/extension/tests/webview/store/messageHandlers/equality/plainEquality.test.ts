import { describe, expect, it } from 'vitest';
import { arePlainObjectValuesEqual } from '../../../../../src/webview/store/messageHandlers/equality/plainEquality';

describe('webview/store/messageHandlers/equality/plainEquality', () => {
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
});
