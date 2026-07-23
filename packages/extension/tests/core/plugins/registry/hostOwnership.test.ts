import { describe, expect, it } from 'vitest';

import { PluginRegistry } from '../../../../src/core/plugins/registry/manager';

describe('Core plugin registry host ownership', () => {
  it('does not expose Extension UI APIs', () => {
    const registry = new PluginRegistry();

    expect(registry).not.toHaveProperty('configureV2');
    expect(registry).not.toHaveProperty('getPluginAPI');
    expect(registry).not.toHaveProperty('listAvailableGraphViewContributions');
  });
});
