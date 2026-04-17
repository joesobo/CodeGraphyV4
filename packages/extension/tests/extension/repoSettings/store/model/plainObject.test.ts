import { describe, expect, it } from 'vitest';
import {
  deepClone,
  deepMerge,
  isPlainObject,
} from '../../../../../src/extension/repoSettings/store/model/plainObject';
describe('extension/repoSettings/store/model/plainObject', () => {
  it('deep clones nested objects and arrays without preserving references', () => {
    const original = {
      legend: [{ id: 'legend-rule', pattern: 'src/**', color: '#123456' }],
      timeline: { maxCommits: 500, playbackSpeed: 1 },
    };

    const cloned = deepClone(original);
    cloned.legend[0].color = '#abcdef';
    cloned.timeline.playbackSpeed = 2;

    expect(cloned).toEqual({
      legend: [{ id: 'legend-rule', pattern: 'src/**', color: '#abcdef' }],
      timeline: { maxCommits: 500, playbackSpeed: 2 },
    });
    expect(original).toEqual({
      legend: [{ id: 'legend-rule', pattern: 'src/**', color: '#123456' }],
      timeline: { maxCommits: 500, playbackSpeed: 1 },
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
        timeline: { maxCommits: 500, playbackSpeed: 1 },
      },
      {
        legend: [{ id: 'override', pattern: 'tests/**', color: '#abcdef' }],
        nodeColors: { folder: '#654321' },
        timeline: { playbackSpeed: 2 },
      },
    );

    expect(merged).toEqual({
      legend: [{ id: 'override', pattern: 'tests/**', color: '#abcdef' }],
      nodeColors: { file: '#111111', folder: '#654321' },
      timeline: { maxCommits: 500, playbackSpeed: 2 },
    });
  });

  it('returns the override when either side is not a plain object', () => {
    expect(deepMerge({ timeline: { playbackSpeed: 1 } }, null)).toEqual({ timeline: { playbackSpeed: 1 } });
    expect(deepMerge({ timeline: { playbackSpeed: 1 } }, ['override'])).toEqual(['override']);
    expect(deepMerge('base', { playbackSpeed: 2 })).toEqual({ playbackSpeed: 2 });
  });
});
