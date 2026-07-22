import { describe, expect, it } from 'vitest';
import { normalizePersistedSettingsShape } from '../../../../../../src/extension/repoSettings/store/model/persistedShape';

describe('extension/repoSettings persisted plugin shape', () => {
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
        { id: 'codegraphy.markdown', activation: 'enabled' },
        { id: '@codegraphy-dev/plugin-vue', activation: 'enabled' },
      ],
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
          activation: 'enabled',
          disabledFilterPatterns: ['**/*.md'],
          options: { includeFrontmatter: true },
        },
        { id: '@codegraphy-dev/plugin-vue', activation: 'enabled' },
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
