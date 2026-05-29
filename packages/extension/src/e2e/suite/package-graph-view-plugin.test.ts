import * as assert from 'assert';
import * as vscode from 'vscode';

interface CodeGraphyAPI {
  getGraphData(): import('../../shared/graph/contracts').IGraphData;
  sendToWebview(message: unknown): void;
  onWebviewMessage(handler: (message: unknown) => void): vscode.Disposable;
  dispatchWebviewMessage(message: unknown): Promise<void>;
  onExtensionMessage(handler: (message: unknown) => void): vscode.Disposable;
}

const PACKAGE_NAME = '@codegraphy/e2e-graph-view-plugin';
const PLUGIN_ID = 'e2e.graph-view-plugin';

async function getAPI(): Promise<CodeGraphyAPI> {
  const ext = vscode.extensions.getExtension<CodeGraphyAPI>('codegraphy.codegraphy');
  assert.ok(ext, 'Extension not found');
  return ext.activate();
}

function waitForExtensionMessageWhere<TMessage>(
  api: CodeGraphyAPI,
  type: string,
  predicate: (message: TMessage) => boolean,
  timeoutMs: number,
): Promise<TMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for extension message: ${type}`)),
      timeoutMs,
    );
    const disposable = api.onExtensionMessage((msg: unknown) => {
      const message = msg as TMessage & { type?: string };
      if (message.type !== type || !predicate(message)) {
        return;
      }

      clearTimeout(timer);
      disposable.dispose();
      resolve(message);
    });
  });
}

suite('Package Graph View plugin lifecycle', function () {
  this.timeout(60_000);

  test('injects, disables, cleans up, and re-injects package webview contributions', async function() {
    const api = await getAPI();

    const injected = waitForExtensionMessageWhere<{
      type: 'PLUGIN_WEBVIEW_INJECT';
      payload: { pluginId: string };
    }>(
      api,
      'PLUGIN_WEBVIEW_INJECT',
      message => message.payload.pluginId === PLUGIN_ID,
      30_000,
    );
    await vscode.commands.executeCommand('codegraphy.open');
    await injected;

    const disabled = waitForExtensionMessageWhere<{
      type: 'PLUGINS_UPDATED';
      payload: { plugins: Array<{ enabled: boolean; packageName?: string }> };
    }>(
      api,
      'PLUGINS_UPDATED',
      message => message.payload.plugins.some(plugin =>
        plugin.packageName === PACKAGE_NAME && plugin.enabled === false
      ),
      30_000,
    );

    await api.dispatchWebviewMessage({
      type: 'TOGGLE_PLUGIN',
      payload: {
        pluginId: PLUGIN_ID,
        packageName: PACKAGE_NAME,
        enabled: false,
      },
    });

    await disabled;

    const reinjected = waitForExtensionMessageWhere<{
      type: 'PLUGIN_WEBVIEW_INJECT';
      payload: { pluginId: string };
    }>(
      api,
      'PLUGIN_WEBVIEW_INJECT',
      message => message.payload.pluginId === PLUGIN_ID,
      30_000,
    );

    await api.dispatchWebviewMessage({
      type: 'TOGGLE_PLUGIN',
      payload: {
        pluginId: PLUGIN_ID,
        packageName: PACKAGE_NAME,
        enabled: true,
      },
    });

    await reinjected;
  });
});
