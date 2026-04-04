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
import * as fs from 'fs';

// The type exported by the extension's activate() function
interface CodeGraphyAPI {
  getGraphData(): import('../../shared/graph/types').IGraphData;
  setGraphData(data: import('../../shared/graph/types').IGraphData): void;
  changeView(viewId: string): Promise<void>;
  setFocusedFile(filePath: string | undefined): void;
  setDepthLimit(depthLimit: number): Promise<void>;
  previewNode(nodeId: string): Promise<void>;
  sendToWebview(message: unknown): void;
  onWebviewMessage(handler: (message: unknown) => void): vscode.Disposable;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForGraphPredicate(
  api: CodeGraphyAPI,
  predicate: (graphData: import('../../shared/graph/types').IGraphData) => boolean,
  timeoutMs = 15_000,
): Promise<import('../../shared/graph/types').IGraphData> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const graphData = api.getGraphData();
    if (predicate(graphData)) {
      return graphData;
    }

    await sleep(250);
  }

  throw new Error('Timed out waiting for graph predicate');
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

// Helper: returns a promise that resolves with the first webview message
// matching the given type, or rejects after timeoutMs.
function waitForMessage(
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

function waitForStoreSnapshot(
  api: CodeGraphyAPI,
  timeoutMs = 10_000,
): Promise<{
  activeViewId: string;
  activeFilePath: string | null;
  depthLimit: number;
  maxDepthLimit: number | null;
  graphNodeIds: string[];
  graphEdgeIds: string[];
}> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Timed out waiting for STORE_SNAPSHOT_RESPONSE')),
      timeoutMs,
    );
    const disposable = api.onWebviewMessage((msg: unknown) => {
      const message = msg as {
        type?: string;
        payload?: {
          activeViewId: string;
          activeFilePath: string | null;
          depthLimit: number;
          maxDepthLimit: number | null;
          graphNodeIds: string[];
          graphEdgeIds: string[];
        };
      };

      if (message.type === 'STORE_SNAPSHOT_RESPONSE' && message.payload) {
        clearTimeout(timer);
        disposable.dispose();
        resolve(message.payload);
      }
    });
  });
}

suite('Graph: Physics Stabilization', function () {
  this.timeout(30_000);

  // This test catches the class of bug where physics settings cause the graph
  // to never stabilize (e.g. avoidOverlap: 1.0 creates persistent border forces
  // that keep velocity above minVelocity indefinitely). If PHYSICS_STABILIZED
  // never arrives, the graph is jittering and the test fails.
  test('graph physics stabilizes within 10 seconds of opening', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Physics never stabilized — graph may be jittering')),
        10_000
      );

      const disposable = api.onWebviewMessage((msg: unknown) => {
        const message = msg as { type: string };
        if (message.type === 'PHYSICS_STABILIZED') {
          clearTimeout(timeout);
          disposable.dispose();
          resolve();
        }
      });
    });
  });
});

suite('Graph: No Node Overlap After Stabilization', function () {
  this.timeout(30_000);

  // This test catches physics settings that leave nodes visually overlapping
  // in dense graphs. It waits for PHYSICS_STABILIZED, then requests the actual
  // canvas positions and radii from the webview and computes pairwise distances.
  // Two nodes overlap when dist(centers) < radius_a + radius_b.
  test('no two nodes overlap after physics stabilizes', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');

    // Wait for physics to stabilize (fails if it never does — see jitter test)
    await waitForMessage(api, 'PHYSICS_STABILIZED', 15_000);

    // Small settling buffer so positions are fully committed
    await sleep(500);

    // Request node positions + sizes from the webview
    const boundsPromise = waitForMessage(api, 'NODE_BOUNDS_RESPONSE', 5_000);
    api.sendToWebview({ type: 'GET_NODE_BOUNDS' });
    const boundsMsg = await boundsPromise as { type: string; payload: { nodes: Array<{ id: string; x: number; y: number; size: number }> } };

    const nodes = boundsMsg.payload.nodes;
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

suite('Graph: Depth View', function () {
  this.timeout(60_000);

  test('previewing a node in depth view filters the graph to depth 1', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(1_000);

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, 'Workspace folder required for depth view e2e');

    const srcRoot = path.join(workspaceFolder.uri.fsPath, 'src');
    const depthAPath = path.join(srcRoot, '__depth_a__.ts');
    const depthBPath = path.join(srcRoot, '__depth_b__.ts');
    const depthCPath = path.join(srcRoot, '__depth_c__.ts');

    fs.writeFileSync(depthAPath, "import { depthB } from './__depth_b__';\nexport const depthA = depthB;\n");
    fs.writeFileSync(depthBPath, "import { depthC } from './__depth_c__';\nexport const depthB = depthC;\n");
    fs.writeFileSync(depthCPath, "export const depthC = 'depth-c';\n");

    try {
      api.setGraphData({
        nodes: [
          { id: 'src/__depth_a__.ts', label: '__depth_a__.ts', color: '#ffffff' },
          { id: 'src/__depth_b__.ts', label: '__depth_b__.ts', color: '#ffffff' },
          { id: 'src/__depth_c__.ts', label: '__depth_c__.ts', color: '#ffffff' },
        ],
        edges: [
          { id: 'src/__depth_a__.ts->src/__depth_b__.ts', from: 'src/__depth_a__.ts', to: 'src/__depth_b__.ts' },
          { id: 'src/__depth_b__.ts->src/__depth_c__.ts', from: 'src/__depth_b__.ts', to: 'src/__depth_c__.ts' },
        ],
      });

      await api.changeView('codegraphy.depth-graph');
      await api.setDepthLimit(1);
      await api.previewNode('src/__depth_a__.ts');

      const graphData = await waitForGraphPredicate(api, nextGraphData =>
        nextGraphData.nodes.length === 2
        && nextGraphData.nodes.every(
          node => node.id === 'src/__depth_a__.ts' || node.id === 'src/__depth_b__.ts',
        ),
      );

      assert.deepStrictEqual(
        graphData.nodes.map(node => node.id).sort(),
        ['src/__depth_a__.ts', 'src/__depth_b__.ts'],
      );
      assert.deepStrictEqual(
        graphData.edges.map(edge => edge.id),
        ['src/__depth_a__.ts->src/__depth_b__.ts'],
      );

      const storeSnapshotPromise = waitForStoreSnapshot(api);
      api.sendToWebview({ type: 'REQUEST_STORE_SNAPSHOT' });
      const storeSnapshot = await storeSnapshotPromise;

      assert.strictEqual(storeSnapshot.activeViewId, 'codegraphy.depth-graph');
      assert.strictEqual(storeSnapshot.activeFilePath, 'src/__depth_a__.ts');
      assert.deepStrictEqual(
        [...storeSnapshot.graphNodeIds].sort(),
        ['src/__depth_a__.ts', 'src/__depth_b__.ts'],
      );
      assert.deepStrictEqual(
        storeSnapshot.graphEdgeIds,
        ['src/__depth_a__.ts->src/__depth_b__.ts'],
      );
    } finally {
      for (const filePath of [depthAPath, depthBPath, depthCPath]) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
  });
});
