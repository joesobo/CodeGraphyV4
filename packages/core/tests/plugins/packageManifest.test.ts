import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { describe, expect, it } from 'vitest';

import {
  parseCodeGraphyPluginPackageManifest,
} from '../../src';
import { assertPluginApiCompatibility } from '../../src/plugins/compatibility';
import { compareSemver, parseSemver } from '../../src/plugins/semverParts';

function plugin(apiVersion: unknown): IPlugin {
  return {
    id: 'codegraphy.test',
    name: 'Test',
    version: '1.0.0',
    apiVersion: apiVersion as string,
    supportedExtensions: ['.test'],
  };
}

describe('CodeGraphy plugin package manifest', () => {
  it('accepts plugin metadata from package.json without importing runtime code', () => {
    expect(parseCodeGraphyPluginPackageManifest({
      name: '@codegraphy-dev/plugin-vue',
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
      package: '@codegraphy-dev/plugin-vue',
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
      name: '@codegraphy-dev/plugin-vue',
      version: '',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
      },
    })).toBeNull();
    expect(parseCodeGraphyPluginPackageManifest({
      name: '@codegraphy-dev/plugin-vue',
      version: '1.0.0',
      codegraphy: {
        type: 'theme',
        apiVersion: '^2.0.0',
      },
    })).toBeNull();
    expect(parseCodeGraphyPluginPackageManifest({
      name: '@codegraphy-dev/plugin-vue',
      version: '1.0.0',
      codegraphy: {
        type: 'plugin',
        apiVersion: '',
      },
    })).toBeNull();
  });

  it('accepts compatible plugin API ranges and rejects unsupported versions', () => {
    expect(() => assertPluginApiCompatibility(plugin('2'))).not.toThrow();
    expect(() => assertPluginApiCompatibility(plugin('^2.0.0'))).not.toThrow();
    expect(() => assertPluginApiCompatibility(plugin(undefined))).toThrow(
      "Plugin 'codegraphy.test' must declare a string apiVersion",
    );
    expect(() => assertPluginApiCompatibility(plugin('^3.0.0'))).toThrow(
      "Plugin 'codegraphy.test' targets unsupported CodeGraphy Plugin API '^3.0.0'.",
    );
  });

  it('parses exact semantic versions and rejects non-exact versions', () => {
    expect(parseSemver('  2.10.3  ')).toEqual({ major: 2, minor: 10, patch: 3 });
    expect(parseSemver('12.10.34')).toEqual({ major: 12, minor: 10, patch: 34 });
    expect(parseSemver('2.10')).toBeUndefined();
    expect(parseSemver('^2.10.3')).toBeUndefined();
    expect(parseSemver('2.10.3-beta')).toBeUndefined();
  });

  it('compares semantic versions by major, then minor, then patch', () => {
    expect(compareSemver({ major: 2, minor: 0, patch: 0 }, { major: 1, minor: 9, patch: 9 })).toBeGreaterThan(0);
    expect(compareSemver({ major: 1, minor: 9, patch: 9 }, { major: 2, minor: 0, patch: 0 })).toBeLessThan(0);
    expect(compareSemver({ major: 2, minor: 1, patch: 0 }, { major: 2, minor: 3, patch: 0 })).toBeLessThan(0);
    expect(compareSemver({ major: 2, minor: 1, patch: 5 }, { major: 2, minor: 1, patch: 3 })).toBeGreaterThan(0);
    expect(compareSemver({ major: 2, minor: 1, patch: 5 }, { major: 2, minor: 1, patch: 5 })).toBe(0);
  });
});
