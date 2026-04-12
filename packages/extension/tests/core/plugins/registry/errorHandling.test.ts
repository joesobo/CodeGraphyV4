import { describe, expect, it, vi } from 'vitest';
import { PluginRegistry } from '@/core/plugins/registry/manager';
import { EventBus } from '@/core/plugins/events/bus';
import { DecorationManager } from '@/core/plugins/decoration/manager';
import { ViewRegistry } from '@/core/views/registry';
import { CodeGraphyAPIImpl } from '@/core/plugins/api/instance';
import { IPlugin } from '@/core/plugins/types/contracts';

function createPlugin(id: string, overrides: Partial<IPlugin> = {}): IPlugin {
  return {
    id,
    name: `Test Plugin ${id}`,
    version: '1.0.0',
    apiVersion: '^2.0.0',
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
  it('uses a custom log function when configureV2 provides one', () => {
    const logFn = vi.fn();
    const registry = new PluginRegistry();
    registry.configureV2({
      eventBus: new EventBus(),
      decorationManager: new DecorationManager(),
      viewRegistry: new ViewRegistry(),
      graphProvider: () => ({ nodes: [], edges: [] }),
      commandRegistrar: () => ({ dispose: () => {} }),
      webviewSender: () => {},
      workspaceRoot: '/workspace',
      logFn,
    });
    const plugin = createPlugin('custom-logger');

    registry.register(plugin);
    registry.getPluginAPI(plugin.id)?.log('warn', 'through-custom-log');

    expect(logFn).toHaveBeenCalledWith('warn', '[custom-logger]', 'through-custom-log');
  });

  it('accepts whitespace-padded compatible core api ranges', () => {
    const registry = createConfiguredRegistry();
    const plugin = createPlugin('trimmed-core-range', {
      apiVersion: ' ^2.0.0 ',
    });

    expect(() => registry.register(plugin)).not.toThrow();
  });

  it('reports malformed core apiVersion strings with exact guidance', () => {
    const registry = createConfiguredRegistry();
    const plugin = createPlugin('bad-range-plugin', {
      apiVersion: 'latest',
    });

    expect(() => registry.register(plugin)).toThrow(
      "Plugin 'bad-range-plugin' declares invalid apiVersion 'latest'. Use '^2.0.0' or an exact semver string."
    );
  });

  it('reports future core api ranges with the host version in the message', () => {
    const registry = createConfiguredRegistry();
    const plugin = createPlugin('future-plugin', {
      apiVersion: '^3.0.0',
    });

    expect(() => registry.register(plugin)).toThrow(
      "Plugin 'future-plugin' requires future CodeGraphy Plugin API '^3.0.0', but host provides '2.0.0'."
    );
  });

  it('classifies whitespace-padded future core api ranges as future requirements', () => {
    const registry = createConfiguredRegistry();
    const plugin = createPlugin('trimmed-future-plugin', {
      apiVersion: ' ^3.0.0 ',
    });

    expect(() => registry.register(plugin)).toThrow(
      "Plugin 'trimmed-future-plugin' requires future CodeGraphy Plugin API ' ^3.0.0 ', but host provides '2.0.0'."
    );
  });

  it('reports unsupported older core api ranges with the host version in the message', () => {
    const registry = createConfiguredRegistry();
    const plugin = createPlugin('legacy-plugin', {
      apiVersion: '^1.0.0',
    });

    expect(() => registry.register(plugin)).toThrow(
      "Plugin 'legacy-plugin' targets unsupported CodeGraphy Plugin API '^1.0.0'. Host provides '2.0.0'."
    );
  });

  it('treats same-major newer minor ranges as unsupported instead of future-only', () => {
    const registry = createConfiguredRegistry();
    const plugin = createPlugin('minor-ahead-plugin', {
      apiVersion: '^2.1.0',
    });

    expect(() => registry.register(plugin)).toThrow(
      "Plugin 'minor-ahead-plugin' targets unsupported CodeGraphy Plugin API '^2.1.0'. Host provides '2.0.0'."
    );
  });

  it('warns with the full compatibility message for incompatible webview contributions', () => {
    const registry = createConfiguredRegistry();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const plugin = createPlugin('webview-mismatch', {
      webviewApiVersion: '^2.0.0',
      webviewContributions: { scripts: ['dist/webview.js'] },
    });

    registry.register(plugin);

    expect(warnSpy).toHaveBeenCalledWith(
      "[CodeGraphy] Plugin 'webview-mismatch' declares incompatible webviewApiVersion '^2.0.0' (host: '1.0.0'). Webview contributions may not behave as expected."
    );
    warnSpy.mockRestore();
  });

  it('skips the warning for compatible webview contributions', () => {
    const registry = createConfiguredRegistry();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const plugin = createPlugin('webview-compatible', {
      webviewApiVersion: ' 1.0.0 ',
      webviewContributions: { scripts: ['dist/webview.js'] },
    });

    registry.register(plugin);

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('logs analysis failures with the file path and plugin id', async () => {
    const registry = createConfiguredRegistry();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('Parse error');
    const plugin = createPlugin('analysis-plugin', {
      supportedExtensions: ['.ts'],
      analyzeFile: vi.fn().mockRejectedValue(failure),
    });

    registry.register(plugin);
    await expect(registry.analyzeFile('/workspace/app.ts', 'content', '/workspace')).resolves.toEqual([]);

    expect(errorSpy).toHaveBeenCalledWith(
      '[CodeGraphy] Error analyzing /workspace/app.ts with analysis-plugin:',
      failure
    );
    errorSpy.mockRestore();
  });

  it('routes default API logs to the matching console method', () => {
    const registry = createConfiguredRegistry();
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const plugin = createPlugin('logger-plugin');

    registry.register(plugin);
    const api = registry.getPluginAPI(plugin.id) as CodeGraphyAPIImpl;

    api.log('info', 'hello');
    api.log('warn', 'careful');
    api.log('error', 'boom');

    expect(infoSpy).toHaveBeenCalledWith('[logger-plugin]', 'hello');
    expect(warnSpy).toHaveBeenCalledWith('[logger-plugin]', 'careful');
    expect(errorSpy).toHaveBeenCalledWith('[logger-plugin]', 'boom');
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('logs initialize failures and retries after clearing failed initialization state', async () => {
    const registry = createConfiguredRegistry();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('Init failed');
    const initialize = vi.fn().mockRejectedValue(failure);
    const plugin = createPlugin('retry-init', { initialize });

    registry.register(plugin);
    await registry.initializeAll('/workspace');
    await registry.initializeAll('/workspace');

    expect(initialize).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith('[CodeGraphy] Error initializing plugin retry-init:', failure);
    errorSpy.mockRestore();
  });

  it('skips plugins without initialize hooks', async () => {
    const registry = createConfiguredRegistry();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const plugin = createPlugin('no-initialize');

    registry.register(plugin);
    await expect(registry.initializeAll('/workspace')).resolves.toBeUndefined();

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('logs unload failures with the plugin id', () => {
    const registry = createConfiguredRegistry();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('onUnload failed');
    const plugin = createPlugin('unload-error', {
      onUnload: vi.fn(() => {
        throw failure;
      }),
    });

    registry.register(plugin);
    expect(() => registry.unregister(plugin.id)).not.toThrow();

    expect(errorSpy).toHaveBeenCalledWith('[CodeGraphy] Error in onUnload for plugin unload-error:', failure);
    errorSpy.mockRestore();
  });

  it('logs onLoad failures with the plugin id', () => {
    const registry = createConfiguredRegistry();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('onLoad failed');
    const plugin = createPlugin('load-error', {
      onLoad: vi.fn(() => {
        throw failure;
      }),
    });

    expect(() => registry.register(plugin)).not.toThrow();

    expect(errorSpy).toHaveBeenCalledWith('[CodeGraphy] Error in onLoad for plugin load-error:', failure);
    errorSpy.mockRestore();
  });

  it('logs each notification hook failure with hook-specific context', async () => {
    const registry = createConfiguredRegistry();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const workspaceFailure = new Error('ws');
    const preAnalyzeFailure = new Error('pre');
    const postAnalyzeFailure = new Error('post');
    const rebuildFailure = new Error('rebuild');
    const webviewFailure = new Error('webview');
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
      onWebviewReady: vi.fn(() => {
        throw webviewFailure;
      }),
    });

    registry.register(plugin);
    registry.notifyWorkspaceReady({ nodes: [], edges: [] });
    await registry.notifyPreAnalyze([], '/workspace');
    registry.notifyPostAnalyze({ nodes: [], edges: [] });
    registry.notifyGraphRebuild({ nodes: [], edges: [] });
    registry.notifyWebviewReady();

    expect(errorSpy).toHaveBeenCalledWith('[CodeGraphy] Error in onWorkspaceReady for notify-errors:', workspaceFailure);
    expect(errorSpy).toHaveBeenCalledWith('[CodeGraphy] Error in onPreAnalyze for notify-errors:', preAnalyzeFailure);
    expect(errorSpy).toHaveBeenCalledWith('[CodeGraphy] Error in onPostAnalyze for notify-errors:', postAnalyzeFailure);
    expect(errorSpy).toHaveBeenCalledWith('[CodeGraphy] Error in onGraphRebuild for notify-errors:', rebuildFailure);
    expect(errorSpy).toHaveBeenCalledWith('[CodeGraphy] Error in onWebviewReady for notify-errors:', webviewFailure);
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
    registry.notifyWebviewReady();

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
