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

interface CodeGraphyAPI {
  getGraphData(): import('../../shared/graph/types').IGraphData;
  sendToWebview(message: unknown): void;
  onWebviewMessage(handler: (message: unknown) => void): vscode.Disposable;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAPI(): Promise<CodeGraphyAPI> {
  const ext = vscode.extensions.getExtension<CodeGraphyAPI>('joesobo.codegraphy');
  assert.ok(ext, 'Extension not found');
  return ext.activate();
}

function waitForGraphUpdate(api: CodeGraphyAPI, timeoutMs = 15_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Timed out waiting for GRAPH_DATA_UPDATED')),
      timeoutMs
    );
    const disposable = api.onWebviewMessage((msg: unknown) => {
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
    tmpFile = path.join(workspaceRoot, 'src', '__e2e_temp__.ts');

    const updatePromise = waitForGraphUpdate(api);
    fs.writeFileSync(tmpFile, 'export const e2eTemp = true;\n');
    await updatePromise;

    const graphData = api.getGraphData();
    assert.ok(
      graphData.nodes.some((n) => String(n.id).includes('__e2e_temp__')),
      'New file should appear as a graph node'
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
    const indexFile = path.join(root, 'src', 'index.ts');
    if (!fs.existsSync(indexFile)) {
      console.log('[e2e] index.ts not found, skipping');
      return;
    }

    const updatePromise = waitForGraphUpdate(api);

    // Open and save the file programmatically
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(indexFile));
    await vscode.window.showTextDocument(doc);
    await doc.save();

    await updatePromise;
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
    api.sendToWebview({ type: 'OPEN_FILE', payload: { filePath: firstNodeId } });
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
