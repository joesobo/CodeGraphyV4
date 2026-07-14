import { describe, expect, it } from 'vitest';
import { normalizePersistedSettingsShape } from '../../../../../../src/extension/repoSettings/store/model/persistedShape';

describe('extension/repoSettings/store/model/persistedShape', () => {
  it('returns an empty object for non-object persisted values', () => {
    expect(normalizePersistedSettingsShape(null)).toEqual({});
    expect(normalizePersistedSettingsShape(['legend'])).toEqual({});
    expect(normalizePersistedSettingsShape('settings')).toEqual({});
  });

  it('deduplicates filter patterns and drops unknown top-level settings', () => {
    expect(normalizePersistedSettingsShape({
      verboseDiagnostics: true,
      filterPatterns: ['**/*.png', '**/*.png', 42, '**/*.tmp'],
      cssSnippets: {
        '.codegraphy/snippets/graph.css': true,
        '  .codegraphy/snippets/focus.css  ': false,
        '.codegraphy/snippets/invalid.css': 'yes',
        '': true,
      },
      pluginData: {
        'codegraphy.example': {
          enabled: true,
          preset: 'embers',
          intensity: 0.75,
          unknown: true,
        },
      },
      edgeColors: { import: '#123456' },
      plugins: ['codegraphy.typescript'],
    })).toEqual({
      verboseDiagnostics: true,
      filterPatterns: ['**/*.png', '**/*.tmp'],
      cssSnippets: {
        '.codegraphy/snippets/graph.css': true,
        '.codegraphy/snippets/focus.css': false,
      },
      pluginData: {
        'codegraphy.example': {
          enabled: true,
          preset: 'embers',
          intensity: 0.75,
          unknown: true,
        },
      },
    });
  });

  it('preserves plugin data without knowing plugin-owned settings shape', () => {
    expect(normalizePersistedSettingsShape({
      pluginData: {
        'codegraphy.example': {
          enabled: 'yes',
          preset: 'unknown',
          intensity: 4,
          customModule: ' .codegraphy/particles/my-effect.js ',
        },
      },
    })).toEqual({
      pluginData: {
        'codegraphy.example': {
          enabled: 'yes',
          preset: 'unknown',
          intensity: 4,
          customModule: ' .codegraphy/particles/my-effect.js ',
        },
      },
    });
  });

  it('drops legacy pluginOrder and disabledPlugins settings', () => {
    expect(normalizePersistedSettingsShape({
      pluginOrder: ['codegraphy.vue'],
      disabledPlugins: ['codegraphy.markdown'],
      plugins: [
        { package: '@codegraphy-dev/plugin-markdown' },
        { package: '@codegraphy-dev/plugin-vue' },
      ],
    })).toEqual({
      plugins: [
        { id: 'codegraphy.markdown', enabled: true },
        { id: '@codegraphy-dev/plugin-vue', enabled: true },
      ],
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
        'symbol:method': '#A855F7',
        'symbol:namespace': '#64748B',
        file: '#111111',
      },
      nodeVisibility: {
        symbol: true,
        'symbol:function': true,
        'symbol:method': true,
        'symbol:namespace': true,
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

  it('drops unknown nested physics fields', () => {
    expect(normalizePersistedSettingsShape({
      physics: {
        repelForce: 20,
        mysteryForce: 99,
      },
    })).toEqual({
      physics: { repelForce: 20 },
    });
  });

  it('preserves every supported top-level setting and drops undefined values', () => {
    const normalized = normalizePersistedSettingsShape({
      version: 3,
      maxFiles: 750,
      include: ['src/**'],
      respectGitignore: false,
      showOrphans: true,
      plugins: [],
      pluginData: {
        'codegraphy.organize': { enabled: true },
        'codegraphy.example': { enabled: true, mode: 'demo' },
      },
      nodeColors: { file: '#111111' },
      nodeVisibility: { file: true },
      edgeVisibility: { import: false },
      favorites: ['src/index.ts'],
      bidirectionalEdges: true,
      legend: [],
      legendVisibility: { 'legend-1': true },
      legendOrder: ['legend-1'],
      filterPatterns: ['dist/**'],
      cssSnippets: { '.codegraphy/snippets/graph.css': true },
      disabledCustomFilterPatterns: ['dist/**'],
      disabledPluginFilterPatterns: { 'codegraphy.typescript': ['**/*.spec.ts'] },
      showLabels: false,
      directionMode: 'bidirectional',
      directionColor: '#abcdef',
      particleSpeed: 0.5,
      particleSize: 3,
      depthMode: true,
      depthLimit: 4,
      nodeSizeMode: 'churn',
      physics: {
        repelForce: 20,
        linkDistance: 30,
        linkForce: 0.5,
        damping: 0.2,
        centerForce: 0.1,
        chargeRange: 500,
      },
      unknownTopLevel: 'drop me',
    });

    expect(normalized).toEqual({
      version: 3,
      maxFiles: 750,
      include: ['src/**'],
      respectGitignore: false,
      showOrphans: true,
      plugins: [],
      pluginData: {
        'codegraphy.organize': { enabled: true },
        'codegraphy.example': { enabled: true, mode: 'demo' },
      },
      nodeColors: { file: '#111111' },
      nodeVisibility: { file: true },
      edgeVisibility: { import: false },
      favorites: ['src/index.ts'],
      bidirectionalEdges: true,
      legend: [],
      legendVisibility: { 'legend-1': true },
      legendOrder: ['legend-1'],
      filterPatterns: ['dist/**'],
      cssSnippets: { '.codegraphy/snippets/graph.css': true },
      disabledCustomFilterPatterns: ['dist/**'],
      disabledPluginFilterPatterns: { 'codegraphy.typescript': ['**/*.spec.ts'] },
      showLabels: false,
      directionMode: 'bidirectional',
      directionColor: '#abcdef',
      particleSpeed: 0.5,
      particleSize: 3,
      depthMode: true,
      depthLimit: 4,
      nodeSizeMode: 'churn',
      physics: {
        repelForce: 20,
        linkDistance: 30,
        linkForce: 0.5,
        damping: 0.2,
        centerForce: 0.1,
      },
    });
  });

  it('preserves invalid nested settings while normalizing scalar fallbacks', () => {
    const normalized = normalizePersistedSettingsShape({
      maxFiles: undefined,
      filterPatterns: 'not an array',
      physics: 'invalid physics',
    });

    expect(normalized).toEqual({
      filterPatterns: [],
      physics: 'invalid physics',
    });
    expect(Object.keys(normalized)).not.toContain('maxFiles');
  });

  it('creates stable legend ids from target and sanitized pattern fallbacks', () => {
    expect(normalizePersistedSettingsShape({
      legend: [
        { pattern: 'Src Components/**/*.tsx', color: '#abcdef', target: 'edge' },
        { pattern: '', color: '#123456', target: '' },
        { pattern: '!!!', color: '#654321' },
        { pattern: 'A'.repeat(60), color: '#fedcba' },
        { id: '', pattern: 'tests/**', color: '#111111' },
        { pattern: 42, color: '#222222' },
        { pattern: '---Src---', color: '#333333' },
        { pattern: { length: 1 }, color: '#444444' },
        'not a rule',
      ],
    })).toEqual({
      legend: [
        { id: 'legend:edge:src-components-tsx:1', pattern: 'Src Components/**/*.tsx', color: '#abcdef', target: 'edge' },
        { id: 'legend:node:rule-2:2', pattern: '', color: '#123456', target: '' },
        { id: 'legend:node:rule-3:3', pattern: '!!!', color: '#654321' },
        { id: `legend:node:${'a'.repeat(48)}:4`, pattern: 'A'.repeat(60), color: '#fedcba' },
        { id: 'legend:node:tests:5', pattern: 'tests/**', color: '#111111' },
        { id: 'legend:node:rule-6:6', pattern: 42, color: '#222222' },
        { id: 'legend:node:src:7', pattern: '---Src---', color: '#333333' },
        { id: 'legend:node:rule-8:8', pattern: { length: 1 }, color: '#444444' },
      ],
    });
  });

  it('normalizes non-array legend settings to an empty legend list', () => {
    expect(normalizePersistedSettingsShape({
      legend: { pattern: 'src/**', color: '#abcdef' },
    })).toEqual({
      legend: [],
    });
  });

  it('normalizes plugin package entries, options, and disabled filter patterns', () => {
    expect(normalizePersistedSettingsShape({
      plugins: [
        { package: ' @codegraphy-dev/plugin-markdown ', disabledFilterPatterns: ['**/*.md', 7, '**/*.md'], options: { includeFrontmatter: true } },
        { package: '   ' },
        { package: 42 },
        null,
        'not a plugin',
        { package: '@codegraphy-dev/plugin-vue', disabledFilterPatterns: [], options: ['invalid'] },
      ],
    })).toEqual({
      plugins: [
        {
          id: 'codegraphy.markdown',
          enabled: true,
          disabledFilterPatterns: ['**/*.md'],
          options: { includeFrontmatter: true },
        },
        { id: '@codegraphy-dev/plugin-vue', enabled: true },
      ],
    });
  });

  it('drops plugin settings when the persisted value has no valid plugin packages', () => {
    expect(normalizePersistedSettingsShape({
      plugins: [
        { package: '' },
        { name: '@codegraphy-dev/plugin-typescript' },
      ],
    })).toEqual({});
    expect(normalizePersistedSettingsShape({ plugins: 'not an array' })).toEqual({});
  });

  it('keeps pluginData only when it is an object', () => {
    expect(normalizePersistedSettingsShape({
      pluginData: { 'codegraphy.organize': { sections: [] } },
    })).toEqual({
      pluginData: { 'codegraphy.organize': { sections: [] } },
    });
    expect(normalizePersistedSettingsShape({
      pluginData: ['codegraphy.organize'],
    })).toEqual({});
  });

});
