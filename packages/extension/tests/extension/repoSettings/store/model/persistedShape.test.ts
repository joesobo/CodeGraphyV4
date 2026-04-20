import { describe, expect, it } from 'vitest';
import { normalizePersistedSettingsShape } from '../../../../../src/extension/repoSettings/store/model/persistedShape';

describe('extension/repoSettings/store/model/persistedShape', () => {
  it('returns an empty object for non-object persisted values', () => {
    expect(normalizePersistedSettingsShape(null)).toEqual({});
    expect(normalizePersistedSettingsShape(['legend'])).toEqual({});
    expect(normalizePersistedSettingsShape('settings')).toEqual({});
  });

  it('deduplicates filter patterns and drops unknown top-level settings', () => {
    expect(normalizePersistedSettingsShape({
      filterPatterns: ['**/*.png', '**/*.png', 42, '**/*.tmp'],
      edgeColors: { import: '#123456' },
      plugins: ['codegraphy.typescript'],
    })).toEqual({
      filterPatterns: ['**/*.png', '**/*.tmp'],
    });
  });

  it('keeps explicit legend and node color settings only', () => {
    expect(normalizePersistedSettingsShape({
      legend: [{ id: 'legend-1', pattern: 'tests/**', color: '#abcdef' }],
      nodeColors: { folder: '#654321', file: '#111111' },
      unknownNested: { value: true },
    })).toEqual({
      legend: [{ id: 'legend-1', pattern: 'tests/**', color: '#abcdef' }],
      nodeColors: { folder: '#654321', file: '#111111' },
    });
  });

  it('drops legacy folder color and exclude aliases', () => {
    expect(normalizePersistedSettingsShape({
      nodeColors: 'invalid',
      folderNodeColor: '#445566',
      filterPatterns: [],
      exclude: ['legacy'],
    })).toEqual({
      filterPatterns: [],
      nodeColors: 'invalid',
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

  it('drops unknown nested physics and timeline fields', () => {
    expect(normalizePersistedSettingsShape({
      physics: {
        repelForce: 20,
        mysteryForce: 99,
      },
      timeline: {
        maxCommits: 1000,
        unknownTimelineKey: true,
      },
    })).toEqual({
      physics: { repelForce: 20 },
      timeline: { maxCommits: 1000 },
    });
  });
});
