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
  getGraphData(): import('../../shared/graph/types').IGraphData;
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

function waitForExtensionMessage(
  api: CodeGraphyAPI,
  type: string,
  timeoutMs: number
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for webview message: ${type}`)),
      timeoutMs
    );
    const disposable = api.onExtensionMessage((msg: unknown) => {
      if ((msg as { type: string }).type === type) {
        clearTimeout(timer);
        disposable.dispose();
        resolve(msg);
      }
    });
  });
}

function waitForWebviewMessage(
  api: CodeGraphyAPI,
  type: string,
  timeoutMs: number
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for webview message: ${type}`)),
      timeoutMs
    );
    const disposable = api.onWebviewMessage((msg: unknown) => {
      if ((msg as { type: string }).type === type) {
        clearTimeout(timer);
        disposable.dispose();
        resolve(msg);
      }
    });
  });
}

interface NodeBoundsResponse {
  payload: {
    nodes: Array<{ id: string; x: number; y: number; size: number }>;
  };
}

async function requestNodeBounds(
  api: CodeGraphyAPI,
  timeoutMs = 5_000,
): Promise<NodeBoundsResponse['payload']['nodes']> {
  const boundsPromise = waitForWebviewMessage(api, 'NODE_BOUNDS_RESPONSE', timeoutMs);
  api.sendToWebview({ type: 'GET_NODE_BOUNDS' });
  const boundsMessage = await boundsPromise as NodeBoundsResponse;
  return boundsMessage.payload.nodes;
}

function didNodeLayoutStabilize(
  previousNodes: NodeBoundsResponse['payload']['nodes'],
  nextNodes: NodeBoundsResponse['payload']['nodes'],
  movementThreshold = 0.75,
): boolean {
  if (previousNodes.length === 0 || previousNodes.length !== nextNodes.length) {
    return false;
  }

  const previousById = new Map(previousNodes.map(node => [node.id, node]));

  return nextNodes.every(node => {
    const previousNode = previousById.get(node.id);
    if (!previousNode) {
      return false;
    }

    const deltaX = node.x - previousNode.x;
    const deltaY = node.y - previousNode.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY) <= movementThreshold;
  });
}

async function waitForStableNodeBounds(
  api: CodeGraphyAPI,
  timeoutMs: number,
): Promise<NodeBoundsResponse['payload']['nodes']> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const firstSample = await requestNodeBounds(api);
    if (firstSample.length === 0) {
      await sleep(500);
      continue;
    }

    await sleep(750);

    const secondSample = await requestNodeBounds(api);
    if (didNodeLayoutStabilize(firstSample, secondSample)) {
      return secondSample;
    }
  }

  throw new Error('Rendered node positions never stabilized');
}

suite('Graph: Physics Stabilization', function () {
  this.timeout(30_000);

  test('graph layout stabilizes within 10 seconds of opening', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await waitForStableNodeBounds(api, 10_000);
  });
});

suite('Graph: No Node Overlap After Stabilization', function () {
  this.timeout(30_000);

  test('no two nodes overlap after physics stabilizes', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');

    const nodes = await waitForStableNodeBounds(api, 15_000);
    assert.ok(nodes.length > 0, 'Expected at least one node');

    // Check every pair for overlap
    const overlapping: string[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        const dist = Math.sqrt(Math.pow(nodeA.x - nodeB.x, 2) + Math.pow(nodeA.y - nodeB.y, 2));
        const minDist = nodeA.size + nodeB.size;
        if (dist < minDist) {
          overlapping.push(`"${path.basename(nodeA.id)}" ↔ "${path.basename(nodeB.id)}" (dist=${dist.toFixed(1)}, need≥${minDist})`);
        }
      }
    }

    assert.strictEqual(
      overlapping.length,
      0,
      `${overlapping.length} overlapping node pair(s):\n  ${overlapping.join('\n  ')}`
    );
  });
});

suite('Graph: Webview Messaging', function () {
  this.timeout(30_000);

  test('extension responds to WEBVIEW_READY with graph data', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(2_000);

    const updatePromise = waitForExtensionMessage(api, 'GRAPH_DATA_UPDATED', 15_000);
    void api.dispatchWebviewMessage({ type: 'WEBVIEW_READY', payload: null });
    await updatePromise;
  });

  test('FIT_VIEW command sends FIT_VIEW message to webview', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(1_000);

    const fitViewPromise = waitForExtensionMessage(api, 'FIT_VIEW', 10_000);
    void vscode.commands.executeCommand('codegraphy.fitView');
    await fitViewPromise;
  });
});

suite('Graph: Depth View', function () {
  this.timeout(60_000);

  test('depth view filters the graph around the active file and still renders bounds', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(5_000);

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    assert.ok(workspaceRoot, 'Workspace folder required');

    const indexDocument = await vscode.workspace.openTextDocument(
      vscode.Uri.file(path.join(workspaceRoot, 'src', 'index.ts'))
    );
    await vscode.window.showTextDocument(indexDocument, { preview: false });
    await sleep(1_000);

    await api.dispatchWebviewMessage({
      type: 'CHANGE_VIEW',
      payload: { viewId: 'codegraphy.depth-graph' },
    });
    await sleep(2_000);

    const depthOneGraph = api.getGraphData();
    const depthOneNodeIds = depthOneGraph.nodes.map((node) => String(node.id)).sort();

    assert.deepStrictEqual(depthOneNodeIds, [
      'src/index.ts',
      'src/types.ts',
      'src/utils.ts',
    ]);
    assert.deepStrictEqual(
      depthOneGraph.edges.map((edge) => String(edge.id)).sort(),
      [
        'src/index.ts->src/types.ts',
        'src/index.ts->src/utils.ts',
        'src/utils.ts->src/types.ts',
      ],
    );

    const depthOneBounds = await requestNodeBounds(api);
    assert.strictEqual(depthOneBounds.length, depthOneGraph.nodes.length);

    await api.dispatchWebviewMessage({
      type: 'CHANGE_DEPTH_LIMIT',
      payload: { depthLimit: 2 },
    });
    await sleep(2_000);

    const depthTwoGraph = api.getGraphData();
    const depthTwoNodeIds = depthTwoGraph.nodes.map((node) => String(node.id)).sort();
    assert.deepStrictEqual(depthTwoNodeIds, [
      'src/deep.ts',
      'src/index.ts',
      'src/types.ts',
      'src/utils.ts',
    ]);
    assert.ok(!depthTwoNodeIds.includes('src/leaf.ts'), 'depth 2 should exclude 3-hop leaf');

    const depthTwoBounds = await requestNodeBounds(api);
    assert.strictEqual(depthTwoBounds.length, depthTwoGraph.nodes.length);

    await api.dispatchWebviewMessage({
      type: 'CHANGE_VIEW',
      payload: { viewId: 'codegraphy.connections' },
    });
  });
});
