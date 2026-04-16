import { describe, expect, it } from 'vitest';
import {
  getNestedValue,
  hasNestedValue,
  setNestedValue,
} from '../../../src/extension/repoSettings/storeValues';

describe('extension/repoSettings/storeValues', () => {
  it('reads and reports nested values through normalized alias keys', () => {
    const settings = {
      nodeColors: { folder: '#123456' },
      filterPatterns: ['src/**'],
      timeline: { playbackSpeed: 2 },
    };

    expect(getNestedValue(settings, 'folderNodeColor')).toBe('#123456');
    expect(getNestedValue(settings, 'exclude')).toEqual(['src/**']);
    expect(getNestedValue(settings, 'timeline.playbackSpeed')).toBe(2);
    expect(getNestedValue(settings, 'timeline.maxCommits')).toBeUndefined();
    expect(getNestedValue(settings, 'exclude.0')).toBeUndefined();
    expect(getNestedValue({ timeline: 2 }, 'timeline.playbackSpeed')).toBeUndefined();
    expect(hasNestedValue(settings, 'exclude')).toBe(true);
    expect(hasNestedValue(settings, 'exclude.0')).toBe(false);
    expect(hasNestedValue({ timeline: 2 }, 'timeline.playbackSpeed')).toBe(false);
    expect(hasNestedValue(settings, 'timeline.maxCommits')).toBe(false);
  });

  it('creates missing nested objects and ignores empty keys when setting values', () => {
    const settings: Record<string, unknown> = {
      nodeColors: '#bad-shape',
    };

    setNestedValue(settings, 'folderNodeColor', '#abcdef');
    setNestedValue(settings, 'physics.chargeRange', 300);
    setNestedValue(settings, 'physics.centerForce', 0.1);
    setNestedValue(settings, '', 'ignored');

    expect(settings).toEqual({
      nodeColors: { folder: '#abcdef' },
      physics: { chargeRange: 300, centerForce: 0.1 },
    });
  });
});
