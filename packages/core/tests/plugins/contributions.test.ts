import { describe, expect, it, vi } from 'vitest';
import { CorePluginRegistry } from '../../src/plugins/registry';

describe('plugins/contributions', () => {
  it('keeps collecting node and edge types after one plugin throws', () => {
    const registry = new CorePluginRegistry();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    registry.register({
      id: 'broken',
      name: 'Broken',
      version: '1.0.0',
      apiVersion: '4',
      supportedExtensions: ['.bad'],
      contributeNodeTypes: () => {
        throw new Error('broken node types');
      },
      contributeEdgeTypes: () => {
        throw new Error('broken edge types');
      },
    });
    registry.register({
      id: 'healthy',
      name: 'Healthy',
      version: '1.0.0',
      apiVersion: '4',
      supportedExtensions: ['.good'],
      contributeNodeTypes: () => [
        { id: 'healthy-node', label: 'Healthy Node', defaultColor: '#111111', defaultVisible: true },
      ],
      contributeEdgeTypes: () => [
        { id: 'healthy:edge', label: 'Healthy Edge', defaultColor: '#222222', defaultVisible: true },
      ],
    });

    expect(registry.listNodeTypes().map(type => type.id)).toEqual(['healthy-node']);
    expect(registry.listEdgeTypes().map(type => type.id)).toEqual(['healthy:edge']);
    expect(consoleError).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });

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
