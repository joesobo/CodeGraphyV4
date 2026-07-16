import { describe, expect, it } from 'vitest';
import { normalizePersistedSettingsShape } from '../../../../../../src/extension/repoSettings/store/model/persistedShape';

describe('extension/repoSettings persisted shape inputs', () => {
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
      nodeSizeMode: 'file-size',
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
      nodeSizeMode: 'file-size',
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

});
