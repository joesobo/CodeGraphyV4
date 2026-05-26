import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { describe, expect, it } from 'vitest';
import { assertPluginApiCompatibility } from '../../src/plugins/compatibility';

function plugin(apiVersion: unknown): IPlugin {
  return {
    id: 'codegraphy.test',
    name: 'Test',
    version: '1.0.0',
    apiVersion: apiVersion as string,
    supportedExtensions: ['.test'],
  };
}

describe('plugins/compatibility', () => {
  it('accepts compatible plugin API ranges', () => {
    expect(() => assertPluginApiCompatibility(plugin('2'))).not.toThrow();
    expect(() => assertPluginApiCompatibility(plugin('^2.0.0'))).not.toThrow();
  });

  it('rejects missing and unsupported plugin API versions', () => {
    expect(() => assertPluginApiCompatibility(plugin(undefined))).toThrow(
      "Plugin 'codegraphy.test' must declare a string apiVersion",
    );
    expect(() => assertPluginApiCompatibility(plugin('^3.0.0'))).toThrow(
      "Plugin 'codegraphy.test' targets unsupported CodeGraphy Plugin API '^3.0.0'.",
    );
  });
});
