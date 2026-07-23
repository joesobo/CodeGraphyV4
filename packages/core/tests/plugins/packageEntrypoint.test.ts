import { describe, expect, it } from 'vitest';
import { createPluginFromModule } from '../../src/plugins/packageModule';
import { satisfiesSemverRange } from '../../src/plugins/semverRange';

describe('plugins/package entrypoint and runtime values', () => {
  it('creates each runtime from the package default factory', async () => {
    await expect(createPluginFromModule({
      default: () => ({
        id: 'default-plugin',
        name: 'Default Plugin',
        version: '1.0.0',
        apiVersion: '3',
        supportedExtensions: ['.ts'],
      }),
    }, 'default-package')).resolves.toMatchObject({ id: 'default-plugin' });
  });

  it.each([
    ['a singleton default export', {
      default: {
        id: 'default-plugin',
      },
    }],
    ['a named factory export', {
      createPlugin: () => ({
        id: 'factory-plugin',
      }),
    }],
    ['a named singleton export', {
      plugin: {
        id: 'named-plugin',
      },
    }],
  ])('rejects %s', async (_label, moduleNamespace) => {
    await expect(createPluginFromModule({
      ...moduleNamespace,
    }, 'invalid-package')).rejects.toThrow(
      "CodeGraphy plugin package 'invalid-package' must export a default Core plugin factory.",
    );
  });

  it('rejects invalid plugin module shapes', async () => {
    await expect(createPluginFromModule(null, 'bad-package')).rejects.toThrow(
      "CodeGraphy plugin package 'bad-package' did not export a module object.",
    );
    await expect(createPluginFromModule({ default: { name: 'Missing ID' } }, 'bad-package')).rejects.toThrow(
      "CodeGraphy plugin package 'bad-package' must export a default Core plugin factory.",
    );
    await expect(createPluginFromModule({ default: () => ({ name: 'Missing ID' }) }, 'bad-package')).rejects.toThrow(
      "CodeGraphy plugin package 'bad-package' default factory returned an invalid Core plugin runtime.",
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
