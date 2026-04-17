import { describe, expect, it } from 'vitest';
import {
  parseOptionalJson,
  readOptionalNumber,
  readOptionalString,
  readRequiredString,
} from '../../../../../src/extension/pipeline/database/cache/rowValues';

describe('pipeline/database/cache/rowValues', () => {
  it('parses optional JSON strings and drops nullish or empty values', () => {
    expect(parseOptionalJson<{ path: string }>('{"path":"src/app.ts"}')).toEqual({
      path: 'src/app.ts',
    });
    expect(parseOptionalJson<unknown>('null')).toBeUndefined();
    expect(parseOptionalJson<unknown>('')).toBeUndefined();
    expect(parseOptionalJson<unknown>(undefined)).toBeUndefined();
  });

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
