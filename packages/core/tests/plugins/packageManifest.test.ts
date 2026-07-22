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
  it('accepts multiple host-owned plugins without importing runtime code', () => {
    expect(parseCodeGraphyPluginPackageManifest({
      name: '@acme/codegraphy-tools',
      version: '1.2.3',
      codegraphy: {
        plugins: [
          {
            id: 'acme.analysis',
            name: 'Acme Analysis',
            host: 'core',
            entry: './dist/core.js',
            apiVersion: '^4.0.0',
          },
          {
            id: 'acme.particles',
            name: 'Acme Particles',
            host: 'codegraphy.extension',
            entry: './dist/extension.js',
            apiVersion: '^1.0.0',
          },
        ],
      },
    })).toEqual({
      package: '@acme/codegraphy-tools',
      version: '1.2.3',
      plugins: [
        {
          id: 'acme.analysis',
          name: 'Acme Analysis',
          host: 'core',
          entry: './dist/core.js',
          apiVersion: '^4.0.0',
        },
        {
          id: 'acme.particles',
          name: 'Acme Particles',
          host: 'codegraphy.extension',
          entry: './dist/extension.js',
          apiVersion: '^1.0.0',
        },
      ],
    });
  });

  it('accepts an open host id without knowing that host API', () => {
    expect(parseCodeGraphyPluginPackageManifest({
      name: '@acme/codegraphy-mcp-tools',
      version: '1.0.0',
      codegraphy: {
        plugins: [{
          id: 'acme.mcp-tools',
          host: 'acme.mcp-server',
          entry: './dist/mcp.js',
          apiVersion: '27',
        }],
      },
    })).toEqual({
      package: '@acme/codegraphy-mcp-tools',
      version: '1.0.0',
      plugins: [{
        id: 'acme.mcp-tools',
        host: 'acme.mcp-server',
        entry: './dist/mcp.js',
        apiVersion: '27',
      }],
    });
  });

  it('rejects packages without CodeGraphy plugin descriptors', () => {
    expect(parseCodeGraphyPluginPackageManifest({
      name: '@codegraphy-dev/not-a-plugin',
      version: '1.0.0',
    })).toBeNull();

    expect(parseCodeGraphyPluginPackageManifest({
      name: '@codegraphy-dev/empty-plugin-package',
      version: '1.0.0',
      codegraphy: {
        plugins: [],
      },
    })).toBeNull();
  });

  it('rejects plugin metadata with missing required manifest values', () => {
    expect(parseCodeGraphyPluginPackageManifest(null)).toBeNull();
    expect(parseCodeGraphyPluginPackageManifest({
      name: '',
      version: '1.0.0',
      codegraphy: {
        plugins: [{ id: 'codegraphy.vue', host: 'core', entry: './dist/plugin.js', apiVersion: '^4.0.0' }],
      },
    })).toBeNull();
    expect(parseCodeGraphyPluginPackageManifest({
      name: '@codegraphy-dev/plugin-vue',
      version: '',
      codegraphy: {
        plugins: [{ id: 'codegraphy.vue', host: 'core', entry: './dist/plugin.js', apiVersion: '^4.0.0' }],
      },
    })).toBeNull();
    expect(parseCodeGraphyPluginPackageManifest({
      name: '@codegraphy-dev/plugin-vue',
      version: '1.0.0',
      codegraphy: {
        plugins: [{ id: '', host: 'core', entry: './dist/plugin.js', apiVersion: '^4.0.0' }],
      },
    })).toBeNull();
    expect(parseCodeGraphyPluginPackageManifest({
      name: '@codegraphy-dev/plugin-vue',
      version: '1.0.0',
      codegraphy: {
        plugins: [{ id: 'codegraphy.vue', host: '', entry: './dist/plugin.js', apiVersion: '^4.0.0' }],
      },
    })).toBeNull();
    expect(parseCodeGraphyPluginPackageManifest({
      name: '@codegraphy-dev/plugin-vue',
      version: '1.0.0',
      codegraphy: {
        plugins: [{ id: 'codegraphy.vue', host: 'core', entry: '', apiVersion: '^4.0.0' }],
      },
    })).toBeNull();
  });

  it('accepts current plugin API ranges and rejects old or future versions', () => {
    expect(() => assertPluginApiCompatibility(plugin('4'))).not.toThrow();
    expect(() => assertPluginApiCompatibility(plugin('^4.0.0'))).not.toThrow();
    expect(() => assertPluginApiCompatibility(plugin(undefined))).toThrow(
      "Plugin 'codegraphy.test' must declare a string apiVersion",
    );
    expect(() => assertPluginApiCompatibility(plugin('^3.0.0'))).toThrow(
      "Plugin 'codegraphy.test' targets unsupported CodeGraphy Plugin API '^3.0.0'. Host provides '4.0.0'.",
    );
    expect(() => assertPluginApiCompatibility(plugin('^5.0.0'))).toThrow(
      "Plugin 'codegraphy.test' targets unsupported CodeGraphy Plugin API '^5.0.0'. Host provides '4.0.0'.",
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
