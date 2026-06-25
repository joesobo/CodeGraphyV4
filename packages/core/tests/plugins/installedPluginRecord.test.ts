import { describe, expect, it } from 'vitest';
import { normalizeInstalledPluginRecord } from '../../src/plugins/installedPluginCache/record';

describe('plugins/installedPluginCache record normalization', () => {
  it('rejects non-records and records missing required string fields', () => {
    expect(normalizeInstalledPluginRecord(null)).toBeNull();
    expect(normalizeInstalledPluginRecord([])).toBeNull();
    expect(normalizeInstalledPluginRecord({
      package: '@codegraphy-dev/plugin-vue',
      version: '1.0.0',
      apiVersion: '^2.0.0',
    })).toBeNull();
  });

  it('normalizes valid records with disclosures and optional default options', () => {
    expect(normalizeInstalledPluginRecord({
      package: '@codegraphy-dev/plugin-vue',
      version: '1.0.0',
      apiVersion: '^2.0.0',
      packageRoot: '/global/plugin-vue',
      disclosures: ['network', 'invalid'],
      defaultOptions: { includeTests: true },
      updateImpact: {
        toggle: 'projection-only',
        defaultSetting: 'settings-only',
      },
    })).toEqual({
      package: '@codegraphy-dev/plugin-vue',
      version: '1.0.0',
      apiVersion: '^2.0.0',
      packageRoot: '/global/plugin-vue',
      disclosures: ['network'],
      defaultOptions: { includeTests: true },
      updateImpact: {
        toggle: 'projection-only',
        defaultSetting: 'settings-only',
      },
    });
  });

  it('omits default options when the stored value is not an object', () => {
    expect(normalizeInstalledPluginRecord({
      package: '@codegraphy-dev/plugin-vue',
      version: '1.0.0',
      apiVersion: '^2.0.0',
      packageRoot: '/global/plugin-vue',
      disclosures: [],
      defaultOptions: true,
    })).toEqual({
      package: '@codegraphy-dev/plugin-vue',
      version: '1.0.0',
      apiVersion: '^2.0.0',
      packageRoot: '/global/plugin-vue',
      disclosures: [],
    });
  });
});
