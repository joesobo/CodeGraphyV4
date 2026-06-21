import { describe, expect, it } from 'vitest';
import {
  createCodeGraphyWorkspacePackageAwarePluginSignature,
  createCodeGraphyWorkspacePluginSignature,
  createCodeGraphyWorkspaceSettingsSignature,
} from '../../src/workspace/signatures';
import { createDefaultCodeGraphyWorkspaceSettings } from '../../src/workspace/settingsDefaults';

describe('workspace/signatures', () => {
  it('creates plugin signatures from runtime plugin order', () => {
    expect(createCodeGraphyWorkspacePluginSignature([])).toBeNull();
    expect(createCodeGraphyWorkspacePluginSignature([
      { id: 'markdown', version: '1.0.0' },
      { id: 'python', version: '2.0.0' },
    ])).toBe('markdown@1.0.0|python@2.0.0');
  });

  it('creates package-aware plugin signatures from runtime, package, and missing entries', () => {
    expect(createCodeGraphyWorkspacePackageAwarePluginSignature({
      runtimePlugins: [],
    })).toBeNull();
    expect(createCodeGraphyWorkspacePackageAwarePluginSignature({
      runtimePlugins: [{ id: 'markdown', version: '1.0.0' }],
      packagePlugins: [{ package: '@codegraphy-dev/plugin-vue', version: '2.0.0' }],
      missingPackagePlugins: ['@codegraphy-dev/plugin-ruby'],
    })).toBe(
      'markdown@1.0.0|npm:@codegraphy-dev/plugin-vue@2.0.0|npm:@codegraphy-dev/plugin-ruby@missing',
    );
  });

  it('keeps settings signatures stable for reordered option keys', () => {
    const defaults = createDefaultCodeGraphyWorkspaceSettings();
    const withoutOptions = createCodeGraphyWorkspaceSettingsSignature({
      ...defaults,
      plugins: [{
        id: 'codegraphy.vue',
        enabled: true,
      }],
    });
    const first = createCodeGraphyWorkspaceSettingsSignature({
      ...defaults,
      plugins: [{
        id: 'codegraphy.vue',
        enabled: true,
        options: { includeTests: true, pythonVersion: '3.12' },
      }],
    });
    const second = createCodeGraphyWorkspaceSettingsSignature({
      ...defaults,
      plugins: [{
        id: 'codegraphy.vue',
        enabled: true,
        options: { pythonVersion: '3.12', includeTests: true },
      }],
    });

    expect(second).toBe(first);
    expect(first).not.toBe(withoutOptions);
  });

  it('changes settings signatures when visible graph settings or plugin filters change', () => {
    const defaults = createDefaultCodeGraphyWorkspaceSettings();
    const first = createCodeGraphyWorkspaceSettingsSignature(defaults);

    expect(createCodeGraphyWorkspaceSettingsSignature({
      ...defaults,
      showOrphans: false,
    })).not.toBe(first);
    expect(createCodeGraphyWorkspaceSettingsSignature({
      ...defaults,
      plugins: [{
        id: 'codegraphy.vue',
        enabled: true,
        disabledFilterPatterns: ['**/__pycache__/**'],
      }],
    })).not.toBe(first);
  });

  it('distinguishes plugin packages, empty filters, and populated filters in settings signatures', () => {
    const defaults = createDefaultCodeGraphyWorkspaceSettings();
    const pythonPlugin = createCodeGraphyWorkspaceSettingsSignature({
      ...defaults,
      plugins: [{
        id: 'codegraphy.vue',
        enabled: true,
      }],
    });

    expect(createCodeGraphyWorkspaceSettingsSignature({
      ...defaults,
      plugins: [{
        id: 'codegraphy.ruby',
        enabled: true,
      }],
    })).not.toBe(pythonPlugin);
    expect(createCodeGraphyWorkspaceSettingsSignature({
      ...defaults,
      plugins: [{
        id: 'codegraphy.vue',
        enabled: true,
        disabledFilterPatterns: [],
      }],
    })).toBe(pythonPlugin);
    expect(createCodeGraphyWorkspaceSettingsSignature({
      ...defaults,
      plugins: [{
        id: 'codegraphy.vue',
        enabled: true,
        disabledFilterPatterns: ['**/__pycache__/**'],
      }],
    })).not.toBe(pythonPlugin);
  });
});
