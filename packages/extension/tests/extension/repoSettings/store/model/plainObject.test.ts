import { describe, expect, it } from 'vitest';
import {
  deepClone,
  deepMerge,
  isPlainObject,
} from '../../../../../src/extension/repoSettings/store/model/plainObject';
describe('extension/repoSettings/store/model/plainObject', () => {

  it('recognizes only plain objects', () => {
    expect(isPlainObject({ legend: [] })).toBe(true);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(['legend'])).toBe(false);
    expect(isPlainObject('settings')).toBe(false);
    expect(isPlainObject(42)).toBe(false);
  });

  it('deep merges nested objects while replacing arrays and scalar values', () => {
    const merged = deepMerge(
      {
        legend: [{ id: 'default', pattern: 'src/**', color: '#123456' }],
        nodeColors: { file: '#111111', folder: '#222222' },
      },
      {
        legend: [{ id: 'override', pattern: 'tests/**', color: '#abcdef' }],
        nodeColors: { folder: '#654321' },
      },
    );

    expect(merged).toEqual({
      legend: [{ id: 'override', pattern: 'tests/**', color: '#abcdef' }],
      nodeColors: { file: '#111111', folder: '#654321' },
    });
  });

  it('returns the override when either side is not a plain object', () => {
    expect(deepMerge({ }, null)).toEqual({ });
    expect(deepMerge({ }, ['override'])).toEqual(['override']);
    expect(deepMerge('base', { })).toEqual({ });
  });
});
