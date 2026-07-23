import { vi } from 'vitest';
import type { IPlugin } from '@/core/plugins/types/contracts';
import { PluginRegistry } from '@/core/plugins/registry/manager';

export function createMockPlugin(overrides: Partial<IPlugin> = {}): IPlugin {
  return {
    id: 'test.plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    apiVersion: '^4.0.0',
    supportedExtensions: ['.test'],
    analyzeFile: vi.fn(async (filePath: string) => ({
      filePath,
      relations: [],
    })),
    ...overrides,
  } as IPlugin;
}

export function createConfiguredRegistry(): PluginRegistry {
  return new PluginRegistry();
}
