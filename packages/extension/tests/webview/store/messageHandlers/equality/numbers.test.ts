import { describe, expect, it } from 'vitest';
import { areNumberValuesEqual } from '../../../../../src/webview/store/messageHandlers/equality/numbers';

describe('webview/store/messageHandlers/equality/numbers', () => {
  it('uses Object.is semantics for numeric equality', () => {
    expect(areNumberValuesEqual(NaN, NaN)).toBe(true);
    expect(areNumberValuesEqual(-0, 0)).toBe(false);
  });
});
