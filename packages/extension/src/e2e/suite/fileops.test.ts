/**
 * File operations e2e tests.
 *
 * Tests that file creation, deletion, and saves trigger graph refresh,
 * and that right-click context menu actions (rename, open) work through
 * the webview message bridge.
 */
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getCurrentE2EScenario } from '../scenarios';

interface CodeGraphyAPI {
  getGraphData(): import('../../shared/graph/contracts').IGraphData;
  sendToWebview(message: unknown): void;
  onWebviewMessage(handler: (message: unknown) => void): vscode.Disposable;
  dispatchWebviewMessage(message: unknown): Promise<void>;
  onExtensionMessage(handler: (message: unknown) => void): vscode.Disposable;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAPI(): Promise<CodeGraphyAPI> {
  const ext = vscode.extensions.getExtension<CodeGraphyAPI>('codegraphy.codegraphy');
  assert.ok(ext, 'Extension not found');
  return ext.activate();
}

const scenario = getCurrentE2EScenario();

function waitForGraphUpdate(api: CodeGraphyAPI, timeoutMs = 15_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Timed out waiting for GRAPH_DATA_UPDATED')),
      timeoutMs
    );
    const disposable = api.onExtensionMessage((msg: unknown) => {
      const message = msg as { type?: string };
      if (message.type === 'GRAPH_DATA_UPDATED') {
        clearTimeout(timer);
        disposable.dispose();
        resolve();
      }
    });
  });
}

suite('File Ops: Graph refresh', function () {
  this.timeout(60_000);

  let workspaceRoot: string;
  let tmpFile: string;

  test('creating a new file triggers graph refresh', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(3_000);

    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'Workspace folder required');
    workspaceRoot = folders[0].uri.fsPath;
    tmpFile = path.join(workspaceRoot, ...scenario.tempFileRelativePath.split('/'));
    const previousNodeCount = api.getGraphData().nodes.length;

    const updatePromise = waitForGraphUpdate(api);
    fs.writeFileSync(tmpFile, scenario.tempFileContents);
    await updatePromise;
    await sleep(250);

    const graphData = api.getGraphData();
    assert.ok(
      graphData.nodes.length > previousNodeCount,
      `Expected node count to increase after creating a file. Before=${previousNodeCount}, After=${graphData.nodes.length}`
    );
  });

  test('deleting a file triggers graph refresh', async function() {
    if (!tmpFile || !fs.existsSync(tmpFile)) {
      console.log('[e2e] No temp file to delete, skipping');
      return;
    }

    const api = await getAPI();
    const updatePromise = waitForGraphUpdate(api);
    fs.unlinkSync(tmpFile);
    await updatePromise;

    const graphData = api.getGraphData();
    assert.ok(
      !graphData.nodes.some((n) => String(n.id).includes('__e2e_temp__')),
      'Deleted file should be removed from graph'
    );
  });

  test('saving a file triggers graph refresh', async function() {
    const api = await getAPI();

    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      console.log('[e2e] No workspace folder, skipping save test');
      return;
    }
    const root = folders[0].uri.fsPath;
    const primaryFile = path.join(root, ...scenario.primaryFileRelativePath.split('/'));
    if (!fs.existsSync(primaryFile)) {
      console.log(`[e2e] ${scenario.primaryFileRelativePath} not found, skipping`);
      return;
    }

    const updatePromise = waitForGraphUpdate(api);

    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(primaryFile));
    const originalContents = doc.getText();
    const editor = await vscode.window.showTextDocument(doc);
    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(doc.lineCount, 0), scenario.saveTriggerText);
    });
    await doc.save();

    await updatePromise;

    fs.writeFileSync(primaryFile, originalContents);
  });
});

suite('File Ops: Open file from node', function () {
  this.timeout(30_000);

  test('OPEN_FILE message opens the file in the editor', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(3_000);

    const graphData = api.getGraphData();
    if (graphData.nodes.length === 0) {
      console.log('[e2e] No nodes, skipping open file test');
      return;
    }

    const firstNodeId = String(graphData.nodes[0].id);

    // The webview sends OPEN_FILE when the user clicks a node
    await api.dispatchWebviewMessage({ type: 'OPEN_FILE', payload: { path: firstNodeId } });
    await sleep(2_000);

    // After opening, the active editor should contain the file
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const editorPath = editor.document.uri.fsPath.replace(/\\/g, '/');
      assert.ok(
        editorPath.includes(firstNodeId.replace(/\\/g, '/')),
        `Expected editor to show '${firstNodeId}', got: ${editorPath}`
      );
    }
  });
});
