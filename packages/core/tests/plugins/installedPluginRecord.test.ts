import { describe, expect, it } from 'vitest';
import { normalizeInstalledPluginRecord } from '../../src/plugins/installedPluginCache/record';

describe('plugins/installedPluginCache record normalization', () => {
  it('rejects records without the generic plugin identity fields', () => {
    expect(normalizeInstalledPluginRecord(null)).toBeNull();
    expect(normalizeInstalledPluginRecord({
      package: '@codegraphy-dev/plugin-vue',
      version: '1.0.0',
      packageRoot: '/global/plugin-vue',
    })).toBeNull();
  });

  it('normalizes a host-neutral installed plugin record', () => {
    expect(normalizeInstalledPluginRecord({
      package: '@acme/codegraphy-tools',
      version: '1.0.0',
      packageRoot: '/global/codegraphy-tools',
      globallyEnabled: true,
      id: 'acme.webview',
      name: 'Acme Webview',
      host: 'acme.webview',
      entry: './dist/webview.js',
      apiVersion: '^27.0.0',
      data: { toolbarPlacement: 'graph' },
      unknownHostField: { preservedByHost: false },
    })).toEqual({
      package: '@acme/codegraphy-tools',
      version: '1.0.0',
      packageRoot: '/global/codegraphy-tools',
      globallyEnabled: true,
      id: 'acme.webview',
      name: 'Acme Webview',
      host: 'acme.webview',
      entry: './dist/webview.js',
      apiVersion: '^27.0.0',
      data: { toolbarPlacement: 'graph' },
    });
  });

  it('defaults missing global activation to disabled', () => {
    expect(normalizeInstalledPluginRecord({
      package: '@acme/codegraphy-tools',
      version: '1.0.0',
      packageRoot: '/global/codegraphy-tools',
      id: 'acme.core',
      host: 'core',
      entry: './dist/core.js',
      apiVersion: '^4.0.0',
    })?.globallyEnabled).toBe(false);
  });
});
