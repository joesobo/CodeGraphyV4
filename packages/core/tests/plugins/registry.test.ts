import { describe, expect, it } from 'vitest';

import { CorePluginRegistry } from '../../src';

describe('CorePluginRegistry', () => {
  it('accepts the same major-only plugin API shorthand as package manifests', () => {
    const registry = new CorePluginRegistry();

    expect(() => registry.register({
      id: 'codegraphy.test-major-api',
      name: 'Test Major API',
      version: '1.0.0',
      apiVersion: '2',
      supportedExtensions: ['.test'],
    })).not.toThrow();
  });
});
