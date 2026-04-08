import { describe, expect, it } from 'vitest';
import {
  createCodeGraphyPluginSignature,
  createCodeGraphySettingsSignature,
} from '../../../src/extension/repoSettings/signatures';
import { createDefaultCodeGraphyRepoSettings } from '../../../src/extension/repoSettings/defaults';

describe('extension/repoSettings/signatures', () => {
  it('creates a stable plugin signature in registry order', () => {
    expect(createCodeGraphyPluginSignature([
      { plugin: { id: 'codegraphy.markdown', version: '1.0.0' } },
      { plugin: { id: 'codegraphy.typescript', version: '2.0.0' } },
    ])).toBe('codegraphy.markdown@1.0.0|codegraphy.typescript@2.0.0');
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
});
