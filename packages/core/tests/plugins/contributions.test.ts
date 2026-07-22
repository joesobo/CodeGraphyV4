import { describe, expect, it } from 'vitest';
import { CorePluginRegistry } from '../../src/plugins/registry';

describe('plugins/contributions', () => {
  it('lists plugin contributions with later plugins overriding duplicate ids', () => {
    const registry = new CorePluginRegistry();

    registry.register({
      id: 'first',
      name: 'First',
      version: '1.0.0',
      apiVersion: '4',
      supportedExtensions: ['.ts'],
      contributeNodeTypes: () => [
        { id: 'custom', label: 'First Custom', defaultColor: '#111111', defaultVisible: true },
      ],
    });
    registry.register({
      id: 'second',
      name: 'Second',
      version: '1.0.0',
      apiVersion: '4',
      supportedExtensions: ['.md'],
      contributeNodeTypes: () => [
        { id: 'custom', label: 'Second Custom', defaultColor: '#222222', defaultVisible: true },
        { id: 'other', label: 'Other', defaultColor: '#333333', defaultVisible: false },
      ],
    });

    expect(registry.listNodeTypes()).toEqual([
      { id: 'custom', label: 'Second Custom', defaultColor: '#222222', defaultVisible: true },
      { id: 'other', label: 'Other', defaultColor: '#333333', defaultVisible: false },
    ]);
  });
});
