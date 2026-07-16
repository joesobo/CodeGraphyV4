import * as vscode from 'vscode';
import { ensureIndexedGraph, getAPI } from './fixture';
import { waitForExtensionMessage } from './messages';

suite('Graph: Webview Messaging', function () {
  this.timeout(30_000);

  test('extension responds to WEBVIEW_READY with graph data', async function() {
    const api = await getAPI();
    await ensureIndexedGraph(api);

    const updatePromise = waitForExtensionMessage(api, 'GRAPH_DATA_UPDATED', 15_000);
    void api.dispatchWebviewMessage({ type: 'WEBVIEW_READY', payload: null });
    await updatePromise;
  });

  test('FIT_VIEW command sends FIT_VIEW message to webview', async function() {
    const api = await getAPI();
    await ensureIndexedGraph(api);

    const fitViewPromise = waitForExtensionMessage(api, 'FIT_VIEW', 10_000);
    void vscode.commands.executeCommand('codegraphy.fitView');
    await fitViewPromise;
  });

});
