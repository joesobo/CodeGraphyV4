import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  createCodeGraphyPluginSignature,
  createCodeGraphySettingsSignature,
} from '../../../src/extension/repoSettings/signatures';
import { createDefaultCodeGraphyRepoSettings } from '../../../src/extension/repoSettings/defaults';

function hashStableSettings(value: unknown): string {
  return createHash('sha1')
    .update(JSON.stringify(value))
    .digest('hex');
}

describe('extension/repoSettings/signatures', () => {
  it('creates a stable plugin signature in registry order', () => {
    expect(createCodeGraphyPluginSignature([
      { plugin: { id: 'codegraphy.markdown', version: '1.0.0' } },
      { plugin: { id: 'codegraphy.typescript', version: '2.0.0' } },
    ])).toBe('codegraphy.markdown@1.0.0|codegraphy.typescript@2.0.0');
  });

  it('changes the plugin signature when the plugin order changes', () => {
    expect(createCodeGraphyPluginSignature([
      { plugin: { id: 'codegraphy.typescript', version: '2.0.0' } },
      { plugin: { id: 'codegraphy.markdown', version: '1.0.0' } },
    ])).toBe('codegraphy.typescript@2.0.0|codegraphy.markdown@1.0.0');
  });

  it('returns null when no plugins are registered', () => {
    expect(createCodeGraphyPluginSignature([])).toBeNull();
  });

  it('creates the same settings signature for equivalent visibility records regardless of key order', () => {
    const base = createDefaultCodeGraphyRepoSettings();
    const reordered = createDefaultCodeGraphyRepoSettings();

    base.nodeVisibility = { file: true, folder: false, package: false };
    reordered.nodeVisibility = { package: false, file: true, folder: false };

    expect(createCodeGraphySettingsSignature(base)).toBe(
      createCodeGraphySettingsSignature(reordered),
    );
  });

  it('does not invalidate the stored index when only disabled plugins change', () => {
    const enabledState = createDefaultCodeGraphyRepoSettings();
    const disabledState = createDefaultCodeGraphyRepoSettings();

    enabledState.disabledPlugins = [];
    disabledState.disabledPlugins = ['codegraphy.python'];

    expect(createCodeGraphySettingsSignature(enabledState)).toBe(
      createCodeGraphySettingsSignature(disabledState),
    );
  });

  it('changes the settings signature when tracked scalar and list settings change', () => {
    const base = createDefaultCodeGraphyRepoSettings();
    const changed = createDefaultCodeGraphyRepoSettings();

    changed.maxFiles = 900;
    changed.include = ['src/**/*.ts'];
    changed.filterPatterns = ['**/*.png'];
    changed.pluginOrder = ['codegraphy.typescript'];

    expect(createCodeGraphySettingsSignature(changed)).not.toBe(
      createCodeGraphySettingsSignature(base),
    );
  });

  it('hashes the exact normalized default payload for partial settings', () => {
    expect(createCodeGraphySettingsSignature({})).toBe(hashStableSettings({
      maxFiles: null,
      respectGitignore: true,
      depthMode: false,
      depthLimit: 1,
      include: [],
      filterPatterns: [],
      pluginOrder: [],
      nodeVisibility: [],
      edgeVisibility: [],
    }));
  });

  it('hashes the exact normalized payload for explicit settings values', () => {
    expect(createCodeGraphySettingsSignature({
      maxFiles: 250,
      respectGitignore: false,
      depthMode: true,
      depthLimit: 4,
      include: ['src/**/*.ts'],
      filterPatterns: ['**/*.png'],
      pluginOrder: ['codegraphy.typescript'],
      nodeVisibility: { package: false, file: true },
      edgeVisibility: { import: false, call: true },
    })).toBe(hashStableSettings({
      maxFiles: 250,
      respectGitignore: false,
      depthMode: true,
      depthLimit: 4,
      include: ['src/**/*.ts'],
      filterPatterns: ['**/*.png'],
      pluginOrder: ['codegraphy.typescript'],
      nodeVisibility: [
        ['file', true],
        ['package', false],
      ],
      edgeVisibility: [
        ['call', true],
        ['import', false],
      ],
    }));
  });
});
