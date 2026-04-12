import { vi } from 'vitest';
import type { IPlugin } from '@/core/plugins/types/contracts';
import { PluginRegistry } from '@/core/plugins/registry/manager';
import { EventBus } from '@/core/plugins/events/bus';
import { DecorationManager } from '@/core/plugins/decoration/manager';
import { ViewRegistry } from '@/core/views/registry';

export function createMockPlugin(overrides: Partial<IPlugin> = {}): IPlugin {
  return {
    id: 'test.plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: ['.test'],
    analyzeFile: vi.fn(async (filePath: string) => ({
      filePath,
      relations: [],
    })),
    ...overrides,
  } as IPlugin;
}

export function createConfiguredRegistry(): PluginRegistry {
  const registry = new PluginRegistry();
  registry.configureV2({
    eventBus: new EventBus(),
    decorationManager: new DecorationManager(),
    viewRegistry: new ViewRegistry(),
    graphProvider: () => ({ nodes: [], edges: [] }),
    commandRegistrar: () => ({ dispose: () => {} }),
    webviewSender: () => {},
    workspaceRoot: '/workspace',
  });
  return registry;
}
