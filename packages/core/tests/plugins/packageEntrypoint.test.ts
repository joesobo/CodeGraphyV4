import { describe, expect, it } from 'vitest';
import { getEntrypointFromExports } from '../../src/plugins/packageExportEntrypoint';
import { createPluginFromModule } from '../../src/plugins/packageModule';
import { satisfiesSemverRange } from '../../src/plugins/semverRange';

describe('plugins/package entrypoint and runtime values', () => {
  it('resolves package entrypoints from string, root export, and condition maps', () => {
    expect(getEntrypointFromExports('./dist/plugin.js')).toBe('./dist/plugin.js');
    expect(getEntrypointFromExports({ '.': './dist/root.js' })).toBe('./dist/root.js');
    expect(getEntrypointFromExports({
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
      },
    })).toBe('./dist/index.js');
    expect(getEntrypointFromExports({
      '.': {
        default: './dist/default.js',
      },
    })).toBe('./dist/default.js');
    expect(getEntrypointFromExports({
      '.': {
        node: './dist/node.js',
      },
    })).toBe('./dist/node.js');
    expect(getEntrypointFromExports({
      require: './dist/index.cjs',
    })).toBe('./dist/index.cjs');
    expect(getEntrypointFromExports(null)).toBeUndefined();
    expect(getEntrypointFromExports([])).toBeUndefined();
    expect(getEntrypointFromExports({ '.': 42 })).toBeUndefined();
    expect(getEntrypointFromExports({ '.': { types: './dist/index.d.ts' } })).toBeUndefined();
  });

  it('creates plugins from default exports, factory exports, and plugin exports', async () => {
    await expect(createPluginFromModule({
      default: {
        id: 'default-plugin',
        name: 'Default Plugin',
        version: '1.0.0',
        apiVersion: '3',
        supportedExtensions: ['.ts'],
      },
    }, 'default-package')).resolves.toMatchObject({ id: 'default-plugin' });

    await expect(createPluginFromModule({
      createPlugin: () => ({
        id: 'factory-plugin',
        name: 'Factory Plugin',
        version: '1.0.0',
        apiVersion: '3',
        supportedExtensions: ['.ts'],
      }),
    }, 'factory-package')).resolves.toMatchObject({ id: 'factory-plugin' });

    await expect(createPluginFromModule({
      plugin: {
        id: 'named-plugin',
        name: 'Named Plugin',
        version: '1.0.0',
        apiVersion: '3',
        supportedExtensions: ['.ts'],
      },
    }, 'named-package')).resolves.toMatchObject({ id: 'named-plugin' });
  });

  it('rejects invalid plugin module shapes', async () => {
    await expect(createPluginFromModule(null, 'bad-package')).rejects.toThrow(
      "CodeGraphy plugin package 'bad-package' did not export a module object.",
    );
    await expect(createPluginFromModule({ default: { name: 'Missing ID' } }, 'bad-package')).rejects.toThrow(
      "CodeGraphy plugin package 'bad-package' did not export a plugin factory or plugin object.",
    );
  });

  it('checks exact, major-only, and caret semver ranges', () => {
    expect(satisfiesSemverRange('2.1.3', '2')).toBe(true);
    expect(satisfiesSemverRange('2.1.3', '^2.0.0')).toBe(true);
    expect(satisfiesSemverRange('2.1.3', '2.1.3')).toBe(true);
    expect(satisfiesSemverRange('3.0.0', '^2.0.0')).toBe(false);
    expect(satisfiesSemverRange('2.1.3', 'not-a-range')).toBe(false);
    expect(satisfiesSemverRange('not-a-version', '^2.0.0')).toBe(false);
  });
});
