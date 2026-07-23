import { DecorationManager } from '@/core/plugins/decoration/manager';
import { EventBus } from '@/core/plugins/events/bus';
import { PluginRegistry } from '@/core/plugins/registry/manager';
import { IPlugin } from '@/core/plugins/types/contracts';
import { ViewRegistry } from '@/core/views/registry';
import { describe, expect, it, vi } from 'vitest';

function createPlugin(id: string, overrides: Partial<IPlugin> = {}): IPlugin {
  return {
    id,
    name: `Test Plugin ${id}`,
    version: '1.0.0',
    apiVersion: '^4.0.0',
    supportedExtensions: ['.test'],
    analyzeFile: vi.fn(async (filePath: string) => ({ filePath, relations: [] })),
    ...overrides,
  } as IPlugin;
}

function createConfiguredRegistry() {
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

describe('PluginRegistry error handling', () => {


    it('logs each notification hook failure with hook-specific context', async () => {
      const registry = createConfiguredRegistry();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const workspaceFailure = new Error('ws');
      const preAnalyzeFailure = new Error('pre');
      const postAnalyzeFailure = new Error('post');
      const rebuildFailure = new Error('rebuild');
      const plugin = createPlugin('notify-errors', {
        onWorkspaceReady: vi.fn(() => {
          throw workspaceFailure;
        }),
        onPreAnalyze: vi.fn().mockRejectedValue(preAnalyzeFailure),
        onPostAnalyze: vi.fn(() => {
          throw postAnalyzeFailure;
        }),
        onGraphRebuild: vi.fn(() => {
          throw rebuildFailure;
        }),
      });

      registry.register(plugin);
      registry.notifyWorkspaceReady({ nodes: [], edges: [] });
      await registry.notifyPreAnalyze([
        { absolutePath: '/workspace/a.test', relativePath: 'a.test', content: 'const x = 1;' },
      ], '/workspace');
      registry.notifyPostAnalyze({ nodes: [], edges: [] });
      registry.notifyGraphRebuild({ nodes: [], edges: [] });

      expect(errorSpy).toHaveBeenCalledWith('[CodeGraphy] Error in onWorkspaceReady for notify-errors:', workspaceFailure);
      expect(errorSpy).toHaveBeenCalledWith('[CodeGraphy] Error in onPreAnalyze for notify-errors:', preAnalyzeFailure);
      expect(errorSpy).toHaveBeenCalledWith('[CodeGraphy] Error in onPostAnalyze for notify-errors:', postAnalyzeFailure);
      expect(errorSpy).toHaveBeenCalledWith('[CodeGraphy] Error in onGraphRebuild for notify-errors:', rebuildFailure);
      errorSpy.mockRestore();
    });



    it('does not log notification errors when hooks are absent', async () => {
      const registry = createConfiguredRegistry();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const plugin = createPlugin('no-notify-hooks');

      registry.register(plugin);
      registry.notifyWorkspaceReady({ nodes: [], edges: [] });
      await registry.notifyPreAnalyze([], '/workspace');
      registry.notifyPostAnalyze({ nodes: [], edges: [] });
      registry.notifyGraphRebuild({ nodes: [], edges: [] });

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });



    it('does not replay workspace readiness for late plugins when only post-analyze snapshots exist', () => {
      const registry = createConfiguredRegistry();
      const onWorkspaceReady = vi.fn();

      registry.notifyPostAnalyze({ nodes: [{ id: 'late', label: 'late', color: '#fff' }], edges: [] });
      registry.register(
        createPlugin('late-plugin', {
          onWorkspaceReady,
        })
      );

      expect(onWorkspaceReady).not.toHaveBeenCalled();
    });



    it('ignores initializePlugin calls for unknown plugin ids', async () => {
      const registry = createConfiguredRegistry();

      await expect(registry.initializePlugin('missing-plugin', '/workspace')).resolves.toBeUndefined();
    });



    it('ignores replayReadinessForPlugin calls for unknown plugin ids', () => {
      const registry = createConfiguredRegistry();

      expect(() => registry.replayReadinessForPlugin('missing-plugin')).not.toThrow();
    });
});
