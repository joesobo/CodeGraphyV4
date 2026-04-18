import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphViewProviderTestHarness } from '../testHarness';

describe('GraphViewProvider plugin bridge injection', () => {
  let harness = createGraphViewProviderTestHarness();

  beforeEach(() => {
    vi.clearAllMocks();
    harness = createGraphViewProviderTestHarness();
  });

  it('sends PLUGIN_WEBVIEW_INJECT when a plugin declares webviewContributions', async () => {
    const { mockWebview, getMessageHandler } = harness.createResolvedWebview();

    harness.provider.registerExternalPlugin({
      id: 'test.webview-plugin',
      name: 'Webview Plugin',
      version: '1.0.0',
      apiVersion: '^2.0.0',
      supportedExtensions: ['.ts'],
      analyzeFile: async (filePath: string) => ({ filePath, relations: [] }),
      webviewContributions: {
        scripts: ['dist/webview/plugins/test-plugin.js'],
        styles: ['dist/webview/plugins/test-plugin.css'],
      },
    });

    await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
    await new Promise(resolve => setTimeout(resolve, 20));

    const injectCall = mockWebview.postMessage.mock.calls.find(
      (call: unknown[]) => (call[0] as { type?: string }).type === 'PLUGIN_WEBVIEW_INJECT',
    );
    expect(injectCall).toBeDefined();
    const injectMessage = injectCall?.[0] as {
      type: string;
      payload: { pluginId: string; scripts: string[]; styles: string[] };
    };
    expect(injectMessage).toMatchObject({
      type: 'PLUGIN_WEBVIEW_INJECT',
      payload: {
        pluginId: 'test.webview-plugin',
      },
    });
    expect(injectMessage.payload.scripts[0]).toContain(
      'test-plugin.js',
    );
    expect(injectMessage.payload.styles[0]).toContain(
      'test-plugin.css',
    );
  });

  it('resolves Tier-2 relative assets against the registering extension root', async () => {
    const { mockWebview, getMessageHandler } = harness.createResolvedWebview();

    harness.provider.registerExternalPlugin(
      {
        id: 'test.external-webview-plugin',
        name: 'External Webview Plugin',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        supportedExtensions: ['.ts'],
        analyzeFile: async (filePath: string) => ({ filePath, relations: [] }),
        webviewContributions: {
          scripts: ['dist/webview/plugins/external.js'],
        },
      },
      {
        extensionUri: vscode.Uri.file('/test/external-extension'),
      },
    );

    await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
    await new Promise(resolve => setTimeout(resolve, 20));

    const injectCall = mockWebview.postMessage.mock.calls.find(
      (call: unknown[]) => (call[0] as { type?: string }).type === 'PLUGIN_WEBVIEW_INJECT',
    );
    expect(injectCall).toBeDefined();

    const payload = (injectCall?.[0] as { payload: { scripts: string[] } }).payload;
    expect(payload.scripts[0]).toContain('/test/external-extension/dist/webview/plugins/external.js');

    const roots = (mockWebview.options as { localResourceRoots?: Array<{ path?: string; fsPath?: string }> })
      .localResourceRoots;
    expect(roots?.some((root) => root.fsPath === '/test/extension')).toBe(true);
    expect(roots?.some((root) => root.fsPath === '/test/external-extension')).toBe(true);
  });
});
