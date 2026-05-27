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

  it('drops legacy pluginOrder and disabledPlugins settings', () => {
    expect(normalizePersistedSettingsShape({
      pluginOrder: ['codegraphy.python'],
      disabledPlugins: ['codegraphy.markdown'],
      plugins: [
        { package: '@codegraphy-dev/plugin-markdown' },
        { package: '@codegraphy-dev/plugin-python' },
      ],
    })).toEqual({
      plugins: [
        { package: '@codegraphy-dev/plugin-markdown' },
        { package: '@codegraphy-dev/plugin-python' },
      ],
    });
  });

  it('normalizes persisted plugin package names, options, and disabled filter patterns', () => {
    expect(normalizePersistedSettingsShape({
      plugins: [
        {
          package: '  @codegraphy-dev/plugin-python  ',
          disabledFilterPatterns: ['.venv/**', 42, '.venv/**', '**/__pycache__/**'],
          options: {
            pythonPath: '/usr/bin/python3',
          },
        },
        { package: '   ' },
        { package: '@codegraphy-dev/plugin-markdown', disabledFilterPatterns: [] },
        'legacy-plugin-id',
      ],
    })).toEqual({
      plugins: [
        {
          package: '@codegraphy-dev/plugin-python',
          disabledFilterPatterns: ['.venv/**', '**/__pycache__/**'],
          options: {
            pythonPath: '/usr/bin/python3',
          },
        },
        { package: '@codegraphy-dev/plugin-markdown' },
      ],
    });
  });

  it('drops the plugins key when no persisted plugin record is usable', () => {
    expect(normalizePersistedSettingsShape({
      plugins: [
        { package: '' },
        { options: { mode: 'strict' } },
      ],
    })).toEqual({});
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

  it('prunes stale symbol theme keys while preserving the symbol visibility toggle', () => {
    expect(normalizePersistedSettingsShape({
      nodeColors: {
        symbol: '#8B5CF6',
        'symbol:function': '#8B5CF6',
        'symbol:method': '#A855F7',
        'symbol:namespace': '#64748B',
        'symbol:variable': '#14B8A6',
        file: '#111111',
      },
      nodeVisibility: {
        symbol: true,
        'symbol:function': true,
        'symbol:method': true,
        'symbol:namespace': true,
        'symbol:variable': true,
        file: true,
      },
    })).toEqual({
      nodeColors: {
        symbol: '#8B5CF6',
        'symbol:function': '#8B5CF6',
        file: '#111111',
      },
      nodeVisibility: {
        symbol: true,
        'symbol:function': true,
        file: true,
      },
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

  it('keeps normalized graph layout settings and drops invalid layout records', () => {
    expect(normalizePersistedSettingsShape({
      graphLayout: {
        collapsedNodes: {},
        pinnedNodes: {
          'src/a.ts': {
            nodeId: 'src/a.ts',
            '2D': { x: 10, y: 20 },
          },
          bad: {
            nodeId: 'bad',
            '2D': { x: Number.NaN, y: 20 },
          },
        },
        sections: {
          'section-a': {
            id: 'section-a',
            label: 'Layer A',
            color: '#5588aa',
            x: 0,
            y: 0,
            width: 200,
            height: 140,
            collapsed: false,
            updatedAt: '2026-05-07T08:01:00.000Z',
          },
        },
        ownership: {
          'src/a.ts': {
            itemId: 'src/a.ts',
            itemKind: 'node',
            ownerSectionId: 'section-a',
            updatedAt: '2026-05-07T08:02:00.000Z',
          },
        },
      },
      graphSectionDrafts: {},
    })).toEqual({
      graphLayout: {
        collapsedNodes: {},
        pinnedNodes: {
          'src/a.ts': {
            nodeId: 'src/a.ts',
            '2D': { x: 10, y: 20 },
          },
        },
        sections: {
          'section-a': {
            id: 'section-a',
            label: 'Layer A',
            color: '#5588aa',
            x: 0,
            y: 0,
            width: 200,
            height: 140,
            collapsed: false,
            updatedAt: '2026-05-07T08:01:00.000Z',
          },
        },
        ownership: {
          'src/a.ts': {
            itemId: 'src/a.ts',
            itemKind: 'node',
            ownerSectionId: 'section-a',
            updatedAt: '2026-05-07T08:02:00.000Z',
          },
        },
      },
    });
  });
});
