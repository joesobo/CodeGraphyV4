import { describe, expect, it, vi } from 'vitest';
import {
  createHandlers,
  createState,
  flushPluginRegistration,
  vscode,
} from './registration.fixture';
import {
  registerGraphViewExternalPlugin,
  type GraphViewExternalPluginRegistrationState,
} from '../../../../../src/extension/graphView/webview/plugins/registration/register';

describe('graphView/webview/plugins/registration', () => {
  it('waits for analyzer initialization to settle before replaying readiness and reanalyzing', async () => {
    let analyzerInitialized = false;
    let resolveAnalyzerInit: (() => void) | undefined;
    const analyzerInitPromise = new Promise<void>((resolve) => {
      resolveAnalyzerInit = () => {
        analyzerInitialized = true;
        resolve();
      };
    });
    const initializePlugin = vi.fn(async () => undefined);
    const replayReadinessForPlugin = vi.fn();
    const reprocessPluginFiles = vi.fn(async () => undefined);
    const state: GraphViewExternalPluginRegistrationState = {
      pluginExtensionUris: new Map<string, vscode.Uri>(),
      analyzer: {
        clearCache: vi.fn(),
        registry: {
          register: vi.fn(),
          initializePlugin,
          replayReadinessForPlugin,
        },
      },
      get firstAnalysis() {
        return false;
      },
      get readyNotified() {
        return true;
      },
      get analyzerInitialized() {
        return analyzerInitialized;
      },
      get analyzerInitPromise() {
        return analyzerInitPromise;
      },
    };

    registerGraphViewExternalPlugin(
      {
        id: 'plugin.test',
        name: 'Plugin',
        version: '1.0.0',
        apiVersion: '^3.0.0',
        supportedExtensions: ['.ts'],
        analyzeFile: async (filePath: string) => ({ filePath, relations: [] }),
      },
      undefined,
      state,
      createHandlers({ reprocessPluginFiles }),
    );

    await Promise.resolve();
    expect(initializePlugin).not.toHaveBeenCalled();

    resolveAnalyzerInit?.();
    await analyzerInitPromise;
    await flushPluginRegistration();

    expect(initializePlugin).toHaveBeenCalledWith('plugin.test', '/test/workspace');
    expect(replayReadinessForPlugin).toHaveBeenCalledWith('plugin.test');
    expect(reprocessPluginFiles).toHaveBeenCalledWith(['plugin.test']);
  });


  it('logs follow-up failures instead of leaking unhandled rejections', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const initializePlugin = vi.fn(async () => undefined);
    const reprocessPluginFiles = vi.fn(async () => {
      throw new Error('plugin reprocess failed');
    });
    const state = createState({
      firstAnalysis: false,
      readyNotified: true,
      analyzer: {
        clearCache: vi.fn(),
        registry: {
          register: vi.fn(),
          initializePlugin,
          replayReadinessForPlugin: vi.fn(),
        },
      },
    });

    registerGraphViewExternalPlugin(
      {
        id: 'plugin.test',
        name: 'Plugin',
        version: '1.0.0',
        apiVersion: '^3.0.0',
        supportedExtensions: ['.ts'],
        analyzeFile: async (filePath: string) => ({ filePath, relations: [] }),
      },
      undefined,
      state,
      createHandlers({ reprocessPluginFiles }),
    );

    await flushPluginRegistration();

    expect(initializePlugin).toHaveBeenCalledWith('plugin.test', '/test/workspace');
    expect(reprocessPluginFiles).toHaveBeenCalledWith(['plugin.test']);
    expect(consoleError).toHaveBeenCalledWith(
      '[CodeGraphy] External plugin registration follow-up failed for plugin.test:',
      expect.any(Error),
    );

    consoleError.mockRestore();
  });

});
