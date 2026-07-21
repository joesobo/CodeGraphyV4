import { describe, expect, it } from 'vitest';
import {
  readOptionalNumber,
  readOptionalString,
  readRequiredString,
} from '../../../../src/graphCache/database/records/values';

describe('pipeline/database/cache/rowValues', () => {
  it('returns optional strings only for non-empty string values', () => {
    expect(readOptionalString('route')).toBe('route');
    expect(readOptionalString('')).toBeUndefined();
    expect(readOptionalString(7)).toBeUndefined();
  });

  it('returns required strings only for string values', () => {
    expect(readRequiredString('symbol-id')).toBe('symbol-id');
    expect(readRequiredString('')).toBe('');
    expect(readRequiredString(7)).toBeUndefined();
  });

  it('reads optional numbers from numbers and bigints only', () => {
    expect(readOptionalNumber(42)).toBe(42);
    expect(readOptionalNumber(42n)).toBe(42);
    expect(readOptionalNumber('42')).toBeUndefined();
    expect(readOptionalNumber(undefined)).toBeUndefined();
  });
});
