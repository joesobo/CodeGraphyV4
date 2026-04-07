import { describe, expect, it } from 'vitest';
import { isNumberPair } from '../../../../../src/webview/store/messageHandlers/equality/isNumberPair';

describe('webview/store/messageHandlers/equality/isNumberPair', () => {
  it('accepts only pairs of numbers', () => {
    expect(isNumberPair(1, 2)).toBe(true);
    expect(isNumberPair(1, '2')).toBe(false);
    expect(isNumberPair('1', 2)).toBe(false);
  });
});
