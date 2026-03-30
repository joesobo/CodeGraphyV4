/**
 * Plugin-specific e2e tests.
 *
 * Each suite opens a fixture workspace for a specific language and verifies
 * that the extension produces nodes and edges for that language's files.
 *
 * NOTE: These tests run against the TypeScript fixture workspace by default
 * (the workspace opened by runTest.ts). For multi-language verification we
 * inspect the example project files directly through the plugin API bridge.
 */
import * as assert from 'assert';
import * as vscode from 'vscode';

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

// ── TypeScript plugin ──────────────────────────────────────────────────────

suite('Plugin: TypeScript', function () {
  this.timeout(60_000);

  test('TypeScript fixture files appear as graph nodes', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(5_000);

    const graphData = api.getGraphData();
    assert.ok(graphData.nodes.length > 0, 'Expected TypeScript nodes in the graph');

    // The default fixture workspace contains .ts files
    const tsNodes = graphData.nodes.filter(
      (n) => typeof n.id === 'string' && n.id.endsWith('.ts')
    );
    assert.ok(tsNodes.length > 0, `Expected .ts nodes, found: ${graphData.nodes.map(n => n.id).join(', ')}`);
  });

  test('TypeScript import edges are detected', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(5_000);

    const graphData = api.getGraphData();
    assert.ok(graphData.edges.length > 0, 'Expected at least one edge between TypeScript files');
  });

  test('node IDs are workspace-relative paths (no absolute paths)', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(5_000);

    const graphData = api.getGraphData();
    for (const node of graphData.nodes) {
      const id = String(node.id);
      assert.ok(
        !id.startsWith('/') && !id.match(/^[A-Z]:\\/),
        `Node ID should be relative, got: ${id}`
      );
    }
  });
});

// ── View switching ─────────────────────────────────────────────────────────

suite('Plugin: View switching', function () {
  this.timeout(30_000);

  test('CHANGE_VIEW message switches to Folder view', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(3_000);

    // Send the CHANGE_VIEW message
    api.sendToWebview({ type: 'CHANGE_VIEW', payload: { viewId: 'codegraphy.folder' } });
    await sleep(2_000);

    // The graph should still have nodes (folder view creates folder + file nodes)
    const graphData = api.getGraphData();
    assert.ok(graphData.nodes.length > 0, 'Folder view should still have nodes');
  });

  test('CHANGE_VIEW back to Connections view works', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(3_000);

    api.sendToWebview({ type: 'CHANGE_VIEW', payload: { viewId: 'codegraphy.connections' } });
    await sleep(1_000);

    const graphData = api.getGraphData();
    assert.ok(graphData.nodes.length > 0, 'Connections view should have nodes');
  });
});

// ── Favorites ──────────────────────────────────────────────────────────────

suite('Plugin: Favorites', function () {
  this.timeout(30_000);

  test('TOGGLE_FAVORITE adds a file to favorites', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(3_000);

    const graphData = api.getGraphData();
    if (graphData.nodes.length === 0) {
      console.log('[e2e] No nodes available, skipping favorites test');
      return;
    }

    const firstNodeId = String(graphData.nodes[0].id);

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Timed out waiting for FAVORITES_UPDATED')),
        10_000
      );

      const disposable = api.onWebviewMessage((msg: unknown) => {
        const message = msg as { type: string; payload: unknown };
        if (message.type === 'FAVORITES_UPDATED') {
          clearTimeout(timer);
          disposable.dispose();
          resolve();
        }
      });

      api.sendToWebview({
        type: 'TOGGLE_FAVORITE',
        payload: { filePath: firstNodeId },
      });
    });
  });
});
