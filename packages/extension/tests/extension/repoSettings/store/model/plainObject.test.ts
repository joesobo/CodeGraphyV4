import { describe, expect, it } from 'vitest';
import {
  deepClone,
  deepMerge,
  isPlainObject,
} from '../../../../../src/extension/repoSettings/store/model/plainObject';
describe('extension/repoSettings/store/model/plainObject', () => {
  it('deep clones nested objects and arrays without preserving references', () => {
    const original: {
      legend: Array<{ color: string; id: string; pattern: string }>;
      optional?: string;
      physics: { damping: number; linkDistance: number };
    } = {
      legend: [{ id: 'legend-rule', pattern: 'src/**', color: '#123456' }],
      optional: undefined,
      physics: { damping: 0.7, linkDistance: 80 },
    };

    const cloned = deepClone(original);
    cloned.legend[0].color = '#abcdef';
    cloned.physics.damping = 0.5;

    expect(cloned).toEqual({
      legend: [{ id: 'legend-rule', pattern: 'src/**', color: '#abcdef' }],
      optional: undefined,
      physics: { damping: 0.5, linkDistance: 80 },
    });
    expect(original).toEqual({
      legend: [{ id: 'legend-rule', pattern: 'src/**', color: '#123456' }],
      optional: undefined,
      physics: { damping: 0.7, linkDistance: 80 },
    });
  });

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
        physics: { damping: 0.7, linkDistance: 80 },
      },
      {
        legend: [{ id: 'override', pattern: 'tests/**', color: '#abcdef' }],
        nodeColors: { folder: '#654321' },
        physics: { damping: 0.5 },
      },
    );

    expect(merged).toEqual({
      legend: [{ id: 'override', pattern: 'tests/**', color: '#abcdef' }],
      nodeColors: { file: '#111111', folder: '#654321' },
      physics: { damping: 0.5, linkDistance: 80 },
    });
  });

  it('returns the override when either side is not a plain object', () => {
    expect(deepMerge({ physics: { damping: 0.7 } }, null)).toEqual({ physics: { damping: 0.7 } });
    expect(deepMerge({ physics: { damping: 0.7 } }, ['override'])).toEqual(['override']);
    expect(deepMerge('base', { damping: 0.5 })).toEqual({ damping: 0.5 });
  });
});
