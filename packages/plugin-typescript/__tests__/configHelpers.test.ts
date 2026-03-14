import { describe, it, expect } from 'vitest';
import { isRecord, getCompilerOptions, getBaseUrl, getPaths } from '../src/configHelpers';

describe('isRecord', () => {
  it('should return true for plain objects', () => {
    expect(isRecord({ key: 'value' })).toBe(true);
  });

  it('should return true for empty objects', () => {
    expect(isRecord({})).toBe(true);
  });

  it('should return false for null', () => {
    expect(isRecord(null)).toBe(false);
  });

  it('should return true for arrays (callers handle array checks separately)', () => {
    expect(isRecord([1, 2, 3])).toBe(true);
  });

  it('should return false for strings', () => {
    expect(isRecord('hello')).toBe(false);
  });

  it('should return false for numbers', () => {
    expect(isRecord(42)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isRecord(undefined)).toBe(false);
  });
});

describe('getCompilerOptions', () => {
  it('should extract compilerOptions from config', () => {
    const config = { compilerOptions: { target: 'ES2020' } };
    expect(getCompilerOptions(config)).toEqual({ target: 'ES2020' });
  });

  it('should return empty object when compilerOptions is missing', () => {
    expect(getCompilerOptions({})).toEqual({});
  });

  it('should return empty object for non-record config', () => {
    expect(getCompilerOptions(null)).toEqual({});
  });

  it('should return empty object when compilerOptions is not a record', () => {
    expect(getCompilerOptions({ compilerOptions: 'invalid' })).toEqual({});
  });
});

describe('getBaseUrl', () => {
  it('should return baseUrl string', () => {
    expect(getBaseUrl({ baseUrl: '.' })).toBe('.');
  });

  it('should return undefined when baseUrl is missing', () => {
    expect(getBaseUrl({})).toBeUndefined();
  });

  it('should return undefined when baseUrl is not a string', () => {
    expect(getBaseUrl({ baseUrl: 42 })).toBeUndefined();
  });
});

describe('getPaths', () => {
  it('should return valid paths mapping', () => {
    const compilerOptions = { paths: { '@/*': ['src/*'] } };
    expect(getPaths(compilerOptions)).toEqual({ '@/*': ['src/*'] });
  });

  it('should return undefined when paths is missing', () => {
    expect(getPaths({})).toBeUndefined();
  });

  it('should return undefined when paths is not a record', () => {
    expect(getPaths({ paths: 'invalid' })).toBeUndefined();
  });

  it('should return undefined when path targets are not arrays', () => {
    expect(getPaths({ paths: { '@/*': 'src/*' } })).toBeUndefined();
  });

  it('should return undefined when array items are not strings', () => {
    expect(getPaths({ paths: { '@/*': [42] } })).toBeUndefined();
  });

  it('should return undefined when some array items are not strings', () => {
    expect(getPaths({ paths: { '@/*': ['src/*', 42] } })).toBeUndefined();
  });

  it('should handle multiple path aliases', () => {
    const compilerOptions = {
      paths: { '@/*': ['src/*'], '#/*': ['lib/*'] },
    };
    expect(getPaths(compilerOptions)).toEqual({
      '@/*': ['src/*'],
      '#/*': ['lib/*'],
    });
  });
});
