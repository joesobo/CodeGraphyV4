/**
 * Graph data and webview interaction tests.
 *
 * These run inside a real VS Code instance. The extension exports its provider
 * so we can inspect graph data and send/receive webview messages directly,
 * simulating what a user sees in the panel.
 */
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

// The type exported by the extension's activate() function
interface CodeGraphyAPI {
  getGraphData(): import('../../shared/types').IGraphData;
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

suite('Graph: Workspace Analysis', function () {
  this.timeout(60_000);

  test('graph data is produced for the fixture workspace', async function() {
    const api = await getAPI();

    // Open the graph view so the webview initializes and triggers analysis
    await vscode.commands.executeCommand('codegraphy.open');

    // Give analysis time to complete
    await sleep(5_000);

    const graphData = api.getGraphData();
    assert.ok(graphData, 'Graph data should be available after analysis');
    assert.ok(graphData.nodes.length > 0, `Expected nodes, got ${graphData.nodes.length}`);

    console.log(
      `[e2e] Graph has ${graphData.nodes.length} node(s) and ${graphData.edges.length} edge(s)`
    );
  });

  test('fixture files appear as nodes', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(5_000);

    const graphData = api.getGraphData();
    const nodeIds = graphData.nodes.map((n) => n.id);

    // The fixture workspace has src/index.ts, src/utils.ts, src/types.ts
    const expected = ['src/index.ts', 'src/utils.ts', 'src/types.ts'];
    for (const rel of expected) {
      assert.ok(
        nodeIds.some((id) => id.endsWith(rel.replace(/\//g, path.sep)) || id.endsWith(rel)),
        `Node for '${rel}' should be in the graph. Got: ${nodeIds.join(', ')}`
      );
    }
  });

  test('import edges are detected between fixture files', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(5_000);

    const graphData = api.getGraphData();
    assert.ok(
      graphData.edges.length > 0,
      `Expected at least one edge. Graph has ${graphData.edges.length} edges.`
    );

    console.log('[e2e] Edges:', graphData.edges.map((e) => `${e.from} → ${e.to}`).join(', '));
  });
});

suite('Graph: Webview Messaging', function () {
  this.timeout(30_000);

  test('extension responds to WEBVIEW_READY with graph data', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(2_000);

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for GRAPH_DATA_UPDATED')), 15_000);

      const disposable = api.onWebviewMessage((msg: unknown) => {
        const message = msg as { type: string };
        if (message.type === 'GRAPH_DATA_UPDATED') {
          clearTimeout(timeout);
          disposable.dispose();
          resolve();
        }
      });

      // Simulate the webview becoming ready (triggers analysis + data send)
      api.sendToWebview({ type: 'WEBVIEW_READY', payload: null });
    });
  });

  test('FIT_VIEW command sends FIT_VIEW message to webview', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(1_000);

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for FIT_VIEW message')), 10_000);

      const disposable = api.onWebviewMessage((msg: unknown) => {
        const message = msg as { type: string };
        if (message.type === 'FIT_VIEW') {
          clearTimeout(timeout);
          disposable.dispose();
          resolve();
        }
      });

      vscode.commands.executeCommand('codegraphy.fitView');
    });
  });
});
