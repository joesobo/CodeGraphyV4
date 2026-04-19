import { describe, expect, it } from 'vitest';
import { normalizePersistedSettingsShape } from '../../../../../src/extension/repoSettings/store/model/persistedShape';

describe('extension/repoSettings/store/model/persistedShape', () => {
  it('returns an empty object for non-object persisted values', () => {
    expect(normalizePersistedSettingsShape(null)).toEqual({});
    expect(normalizePersistedSettingsShape(['legend'])).toEqual({});
    expect(normalizePersistedSettingsShape('settings')).toEqual({});
  });

  it('deduplicates filter patterns, removes exclude, and backfills legend from groups', () => {
    expect(normalizePersistedSettingsShape({
      filterPatterns: ['**/*.png', '**/*.png', 42, '**/*.tmp'],
      exclude: ['legacy'],
      groups: [{ pattern: 'src/**', color: '#123456' }],
    })).toEqual({
      filterPatterns: ['**/*.png', '**/*.tmp'],
      groups: [{ pattern: 'src/**', color: '#123456' }],
      legend: [{ id: 'legend:node:src:1', pattern: 'src/**', color: '#123456' }],
    });
  });

  it('keeps an existing legend and merges folderNodeColor only when folder is missing', () => {
    expect(normalizePersistedSettingsShape({
      legend: [{ id: 'legend-1', pattern: 'tests/**', color: '#abcdef' }],
      groups: [{ id: 'legacy-group', pattern: 'src/**', color: '#123456' }],
      nodeColors: { folder: '#654321', file: '#111111' },
      folderNodeColor: '#222222',
    })).toEqual({
      legend: [{ id: 'legend-1', pattern: 'tests/**', color: '#abcdef' }],
      groups: [{ id: 'legacy-group', pattern: 'src/**', color: '#123456' }],
      nodeColors: { folder: '#654321', file: '#111111' },
      folderNodeColor: '#222222',
    });
  });

  it('creates nodeColors from folderNodeColor when the persisted shape lacks one', () => {
    expect(normalizePersistedSettingsShape({
      nodeColors: 'invalid',
      folderNodeColor: '#445566',
      filterPatterns: [],
      exclude: ['legacy'],
    })).toEqual({
      filterPatterns: [],
      folderNodeColor: '#445566',
      nodeColors: { folder: '#445566' },
    });
  });

  it('adds runtime ids to persisted legend rules that omit them', () => {
    expect(normalizePersistedSettingsShape({
      legend: [
        { pattern: 'src/**', color: '#abcdef' },
        { id: 'custom-id', pattern: 'import', color: '#123456', target: 'edge' },
      ],
    })).toEqual({
      legend: [
        { id: 'legend:node:src:1', pattern: 'src/**', color: '#abcdef' },
        { id: 'custom-id', pattern: 'import', color: '#123456', target: 'edge' },
      ],
    });
  });
});
