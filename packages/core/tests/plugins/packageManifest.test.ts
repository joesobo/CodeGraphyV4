import { describe, expect, it } from 'vitest';

import {
  parseCodeGraphyPluginPackageManifest,
} from '../../src';

describe('CodeGraphy plugin package manifest', () => {
  it('accepts plugin metadata from package.json without importing runtime code', () => {
    expect(parseCodeGraphyPluginPackageManifest({
      name: '@codegraphy-dev/plugin-python',
      version: '1.2.3',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
        defaultOptions: {
          includeTests: true,
        },
        disclosures: ['network'],
      },
    })).toEqual({
      package: '@codegraphy-dev/plugin-python',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      defaultOptions: {
        includeTests: true,
      },
      disclosures: ['network'],
    });
  });

  it('accepts a major-only plugin API version shorthand', () => {
    expect(parseCodeGraphyPluginPackageManifest({
      name: '@codegraphy-dev/plugin-markdown',
      version: '1.0.0',
      codegraphy: {
        type: 'plugin',
        apiVersion: '2',
      },
    })).toEqual({
      package: '@codegraphy-dev/plugin-markdown',
      version: '1.0.0',
      apiVersion: '2',
      disclosures: [],
    });
  });

  it('rejects packages without compatible CodeGraphy plugin metadata', () => {
    expect(parseCodeGraphyPluginPackageManifest({
      name: '@codegraphy-dev/not-a-plugin',
      version: '1.0.0',
    })).toBeNull();

    expect(() => parseCodeGraphyPluginPackageManifest({
      name: '@codegraphy-dev/plugin-future',
      version: '1.0.0',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^3.0.0',
      },
    })).toThrow("Plugin '@codegraphy-dev/plugin-future' targets unsupported CodeGraphy Plugin API '^3.0.0'.");
  });

  it('rejects plugin metadata with missing required manifest values', () => {
    expect(parseCodeGraphyPluginPackageManifest(null)).toBeNull();
    expect(parseCodeGraphyPluginPackageManifest({
      name: '',
      version: '1.0.0',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
      },
    })).toBeNull();
    expect(parseCodeGraphyPluginPackageManifest({
      name: '@codegraphy-dev/plugin-python',
      version: '',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
      },
    })).toBeNull();
    expect(parseCodeGraphyPluginPackageManifest({
      name: '@codegraphy-dev/plugin-python',
      version: '1.0.0',
      codegraphy: {
        type: 'theme',
        apiVersion: '^2.0.0',
      },
    })).toBeNull();
    expect(parseCodeGraphyPluginPackageManifest({
      name: '@codegraphy-dev/plugin-python',
      version: '1.0.0',
      codegraphy: {
        type: 'plugin',
        apiVersion: '',
      },
    })).toBeNull();
  });
});
