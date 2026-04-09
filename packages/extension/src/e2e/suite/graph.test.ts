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
import { getCurrentE2EScenario } from '../scenarios';

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

const scenario = getCurrentE2EScenario();

suite('Graph: Workspace Analysis', function () {
  this.timeout(60_000);

  test('graph data is produced for the example workspace', async function() {
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

    // The example workspace spans multiple packages and still exposes
    // workspace-relative file IDs to the graph.
    for (const rel of scenario.expectedNodeIds) {
      assert.ok(
        nodeIds.some((id) => id.endsWith(rel.replace(/\//g, path.sep)) || id.endsWith(rel)),
        `Node for '${rel}' should be in the graph. Got: ${nodeIds.join(', ')}`
      );
    }
  });

  test('scenario edges are detected between fixture files', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(5_000);

    const graphData = api.getGraphData();
    const edgeIds = graphData.edges.map((edge) => String(edge.id));
    for (const edgeId of scenario.minimumExpectedEdgeIds) {
      assert.ok(
        edgeIds.includes(edgeId),
        `Expected edge '${edgeId}' in scenario '${scenario.name}'. Got: ${edgeIds.join(', ')}`
      );
    }

    console.log(`[e2e:${scenario.name}] Edges:`, graphData.edges.map((e) => `${e.from} → ${e.to}`).join(', '));
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

async function waitForGraphDataUpdate(
  api: CodeGraphyAPI,
  timeoutMs = 15_000,
): Promise<import('../../shared/graph/types').IGraphData> {
  await waitForExtensionMessage(api, 'GRAPH_DATA_UPDATED', timeoutMs);
  return api.getGraphData();
}

interface NodeBoundsResponse {
  payload: {
    nodes: Array<{ id: string; x: number; y: number; size: number }>;
  };
}

interface GraphRuntimeStateResponse {
  payload: {
    graphMode: '2d' | '3d';
    nodeCount: number;
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

async function requestGraphRuntimeState(
  api: CodeGraphyAPI,
  timeoutMs = 5_000,
): Promise<GraphRuntimeStateResponse['payload']> {
  const statePromise = waitForWebviewMessage(api, 'GRAPH_RUNTIME_STATE_RESPONSE', timeoutMs);
  api.sendToWebview({ type: 'GET_GRAPH_RUNTIME_STATE' });
  const stateMessage = await statePromise as GraphRuntimeStateResponse;
  return stateMessage.payload;
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

async function setDepthMode(api: CodeGraphyAPI, depthMode: boolean): Promise<void> {
  await api.dispatchWebviewMessage({
    type: 'UPDATE_DEPTH_MODE',
    payload: { depthMode },
  });
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

suite('Graph: 3D Mode', function () {
  this.timeout(30_000);

  test('toggle dimension switches the runtime into 3d without the webview reporting a fallback', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(5_000);

    const webviewMessages: unknown[] = [];
    const subscription = api.onWebviewMessage((message: unknown) => {
      webviewMessages.push(message);
    });

    await vscode.commands.executeCommand('codegraphy.toggleDimension');
    await sleep(2_000);

    const runtimeState = await requestGraphRuntimeState(api);
    const nodeBounds = await requestNodeBounds(api);
    subscription.dispose();

    assert.strictEqual(runtimeState.graphMode, '3d');
    assert.ok(runtimeState.nodeCount > 0, '3d mode should keep graph nodes loaded');
    assert.strictEqual(nodeBounds.length, runtimeState.nodeCount);
    assert.ok(
      !webviewMessages.some(
        (message) => (message as { type?: string }).type === 'GRAPH_3D_UNAVAILABLE',
      ),
      `Webview reported 3d fallback: ${JSON.stringify(webviewMessages)}`,
    );
  });
});

suite('Graph: Depth View', function () {
  this.timeout(60_000);

  test('depth view falls back to the full connections graph when no file is active', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(5_000);

    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await sleep(1_000);

    const fullGraph = api.getGraphData();
    assert.ok(fullGraph.nodes.length > 0, 'Expected connections graph data before switching views');

    const depthGraphPromise = waitForGraphDataUpdate(api);
    await setDepthMode(api, true);
    const depthGraph = await depthGraphPromise;

    assert.deepStrictEqual(
      depthGraph.nodes.map(node => String(node.id)).sort(),
      fullGraph.nodes.map(node => String(node.id)).sort(),
    );
    assert.deepStrictEqual(
      depthGraph.edges.map(edge => String(edge.id)).sort(),
      fullGraph.edges.map(edge => String(edge.id)).sort(),
    );
  });

  test('depth view filters the graph around the active file and still renders bounds', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(5_000);

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    assert.ok(workspaceRoot, 'Workspace folder required');

    const document = await vscode.workspace.openTextDocument(
      vscode.Uri.file(path.join(workspaceRoot, ...scenario.depth.rootFileRelativePath.split('/')))
    );
    await vscode.window.showTextDocument(document, { preview: false });
    await sleep(1_000);

    const depthOnePromise = waitForGraphDataUpdate(api);
    await setDepthMode(api, true);
    const depthOneGraph = await depthOnePromise;
    const depthOneNodeIds = depthOneGraph.nodes.map((node) => String(node.id)).sort();

    assert.deepStrictEqual(depthOneNodeIds, scenario.depth.depthOneNodeIds);
    assert.deepStrictEqual(
      depthOneGraph.edges.map((edge) => String(edge.id)).sort(),
      scenario.depth.depthOneEdgeIds,
    );

    const depthOneBounds = await requestNodeBounds(api);
    assert.strictEqual(depthOneBounds.length, depthOneGraph.nodes.length);

    const depthTwoPromise = waitForGraphDataUpdate(api);
    await api.dispatchWebviewMessage({
      type: 'CHANGE_DEPTH_LIMIT',
      payload: { depthLimit: 2 },
    });
    const depthTwoGraph = await depthTwoPromise;
    const depthTwoNodeIds = depthTwoGraph.nodes.map((node) => String(node.id)).sort();
    assert.deepStrictEqual(depthTwoNodeIds, scenario.depth.depthTwoNodeIds);
    for (const excludedNodeId of scenario.depth.excludedAtDepthTwo) {
      assert.ok(
        !depthTwoNodeIds.includes(excludedNodeId),
        `depth 2 should exclude '${excludedNodeId}'`
      );
    }

    const depthTwoBounds = await requestNodeBounds(api);
    assert.strictEqual(depthTwoBounds.length, depthTwoGraph.nodes.length);

    await setDepthMode(api, false);
  });

  test('depth view re-roots around the selected node even without an active editor', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(5_000);

    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await sleep(1_000);

    const depthGraphPromise = waitForGraphDataUpdate(api);
    await setDepthMode(api, true);
    await depthGraphPromise;

    const selectedNodeGraphPromise = waitForGraphDataUpdate(api);
    await api.dispatchWebviewMessage({
      type: 'NODE_SELECTED',
      payload: { nodeId: scenario.depth.selectedNodeId },
    });
    const selectedNodeGraph = await selectedNodeGraphPromise;

    assert.deepStrictEqual(
      selectedNodeGraph.nodes.map(node => String(node.id)).sort(),
      scenario.depth.selectedNodeDepthOneNodeIds,
    );
    assert.deepStrictEqual(
      selectedNodeGraph.edges.map(edge => String(edge.id)).sort(),
      scenario.depth.selectedNodeDepthOneEdgeIds,
    );

    const renderedBounds = await requestNodeBounds(api);
    assert.strictEqual(renderedBounds.length, selectedNodeGraph.nodes.length);

    await setDepthMode(api, false);
  });

  test('depth view re-roots around the selected node even when another editor stays active', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(5_000);

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    assert.ok(workspaceRoot, 'Workspace folder required');

    const document = await vscode.workspace.openTextDocument(
      vscode.Uri.file(path.join(workspaceRoot, ...scenario.depth.rootFileRelativePath.split('/')))
    );
    await vscode.window.showTextDocument(document, { preview: false });
    await sleep(1_000);

    const depthGraphPromise = waitForGraphDataUpdate(api);
    await setDepthMode(api, true);
    await depthGraphPromise;

    const depthLimitResetPromise = waitForGraphDataUpdate(api);
    await api.dispatchWebviewMessage({
      type: 'CHANGE_DEPTH_LIMIT',
      payload: { depthLimit: 1 },
    });
    const depthGraph = await depthLimitResetPromise;

    assert.deepStrictEqual(
      depthGraph.nodes.map(node => String(node.id)).sort(),
      scenario.depth.depthOneNodeIds,
    );

    const selectedNodeGraphPromise = waitForGraphDataUpdate(api);
    await api.dispatchWebviewMessage({
      type: 'NODE_SELECTED',
      payload: { nodeId: scenario.depth.selectedNodeId },
    });
    const selectedNodeGraph = await selectedNodeGraphPromise;

    assert.deepStrictEqual(
      selectedNodeGraph.nodes.map(node => String(node.id)).sort(),
      scenario.depth.selectedNodeDepthOneNodeIds,
    );
    assert.deepStrictEqual(
      selectedNodeGraph.edges.map(edge => String(edge.id)).sort(),
      scenario.depth.selectedNodeDepthOneEdgeIds,
    );

    const renderedBounds = await requestNodeBounds(api);
    assert.strictEqual(renderedBounds.length, selectedNodeGraph.nodes.length);

    await setDepthMode(api, false);
  });

  test('depth view stays filtered when re-rooting from the current node to a visible neighbor', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(5_000);

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    assert.ok(workspaceRoot, 'Workspace folder required');

    const document = await vscode.workspace.openTextDocument(
      vscode.Uri.file(path.join(workspaceRoot, ...scenario.depth.rootFileRelativePath.split('/')))
    );
    await vscode.window.showTextDocument(document, { preview: false });
    await sleep(1_000);

    const depthGraphPromise = waitForGraphDataUpdate(api);
    await setDepthMode(api, true);
    await depthGraphPromise;

    const depthLimitResetPromise = waitForGraphDataUpdate(api);
    await api.dispatchWebviewMessage({
      type: 'CHANGE_DEPTH_LIMIT',
      payload: { depthLimit: 1 },
    });
    const firstDepthGraph = await depthLimitResetPromise;

    assert.deepStrictEqual(
      firstDepthGraph.nodes.map(node => String(node.id)).sort(),
      scenario.depth.depthOneNodeIds,
    );

    const rerootMessages: unknown[] = [];
    const rerootMessageSubscription = api.onExtensionMessage(message => {
      rerootMessages.push(message);
    });

    const rerootGraphPromise = waitForGraphDataUpdate(api);
    await api.dispatchWebviewMessage({
      type: 'NODE_SELECTED',
      payload: { nodeId: scenario.depth.rerootNodeId },
    });
    const rerootGraph = await rerootGraphPromise;

    assert.deepStrictEqual(
      rerootGraph.nodes.map(node => String(node.id)).sort(),
      scenario.depth.rerootDepthOneNodeIds,
    );
    assert.deepStrictEqual(
      rerootGraph.edges.map(edge => String(edge.id)).sort(),
      scenario.depth.rerootDepthOneEdgeIds,
    );
    await sleep(2_000);
    rerootMessageSubscription.dispose();

    const graphUpdates = rerootMessages.filter(
      (message): message is { type: 'GRAPH_DATA_UPDATED'; payload: import('../../shared/graph/types').IGraphData } =>
        (message as { type?: string }).type === 'GRAPH_DATA_UPDATED',
    );
    const activeFileUpdates = rerootMessages.filter(
      (message): message is { type: 'ACTIVE_FILE_UPDATED'; payload: { filePath: string | undefined } } =>
        (message as { type?: string }).type === 'ACTIVE_FILE_UPDATED',
    );
    const lastGraphUpdate = graphUpdates.at(-1)?.payload ?? rerootGraph;

    assert.deepStrictEqual(
      lastGraphUpdate.nodes.map(node => String(node.id)).sort(),
      scenario.depth.rerootDepthOneNodeIds,
    );
    assert.deepStrictEqual(
      lastGraphUpdate.edges.map(edge => String(edge.id)).sort(),
      scenario.depth.rerootDepthOneEdgeIds,
    );
    assert.ok(
      activeFileUpdates.every(update => update.payload.filePath !== undefined),
      `Re-rooting should not clear the focused file. Active file updates: ${JSON.stringify(activeFileUpdates)}`,
    );

    await setDepthMode(api, false);
  });

  test('depth view returns to the full graph when the focused node is cleared', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(5_000);

    const connectionsGraphPromise = waitForGraphDataUpdate(api);
    await setDepthMode(api, false);
    await connectionsGraphPromise;

    const fullGraph = api.getGraphData();
    const fullNodeIds = fullGraph.nodes.map(node => String(node.id)).sort();
    const fullEdgeIds = fullGraph.edges.map(edge => String(edge.id)).sort();

    const depthGraphPromise = waitForGraphDataUpdate(api);
    await setDepthMode(api, true);
    await depthGraphPromise;

    const depthLimitResetPromise = waitForGraphDataUpdate(api);
    await api.dispatchWebviewMessage({
      type: 'CHANGE_DEPTH_LIMIT',
      payload: { depthLimit: 1 },
    });
    await depthLimitResetPromise;

    const selectedNodeGraphPromise = waitForGraphDataUpdate(api);
    await api.dispatchWebviewMessage({
      type: 'NODE_SELECTED',
      payload: { nodeId: scenario.depth.selectedNodeId },
    });
    const selectedNodeGraph = await selectedNodeGraphPromise;

    assert.ok(
      selectedNodeGraph.nodes.length < fullGraph.nodes.length,
      'Selecting a depth root should reduce the rendered graph before clearing it',
    );

    const restoredGraphPromise = waitForGraphDataUpdate(api);
    await api.dispatchWebviewMessage({ type: 'CLEAR_FOCUSED_FILE' });
    const restoredGraph = await restoredGraphPromise;

    assert.deepStrictEqual(
      restoredGraph.nodes.map(node => String(node.id)).sort(),
      fullNodeIds,
    );
    assert.deepStrictEqual(
      restoredGraph.edges.map(edge => String(edge.id)).sort(),
      fullEdgeIds,
    );

    await setDepthMode(api, false);
  });

  test('depth view re-roots again after clearing a selected node and choosing a different node', async function() {
    const api = await getAPI();
    await vscode.commands.executeCommand('codegraphy.open');
    await sleep(5_000);

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    assert.ok(workspaceRoot, 'Workspace folder required');

    const document = await vscode.workspace.openTextDocument(
      vscode.Uri.file(path.join(workspaceRoot, ...scenario.depth.rootFileRelativePath.split('/')))
    );
    await vscode.window.showTextDocument(document, { preview: false });
    await sleep(1_000);

    const depthGraphPromise = waitForGraphDataUpdate(api);
    await setDepthMode(api, true);
    await depthGraphPromise;

    const depthLimitResetPromise = waitForGraphDataUpdate(api);
    await api.dispatchWebviewMessage({
      type: 'CHANGE_DEPTH_LIMIT',
      payload: { depthLimit: 1 },
    });
    const firstDepthGraph = await depthLimitResetPromise;

    assert.deepStrictEqual(
      firstDepthGraph.nodes.map(node => String(node.id)).sort(),
      scenario.depth.depthOneNodeIds,
    );

    const clearedGraphPromise = waitForGraphDataUpdate(api);
    await api.dispatchWebviewMessage({ type: 'CLEAR_FOCUSED_FILE' });
    const clearedGraph = await clearedGraphPromise;
    assert.ok(
      clearedGraph.nodes.length > scenario.depth.selectedNodeDepthOneNodeIds.length,
      'Clearing the focused node should restore a broader graph before re-rooting again',
    );

    const selectedNodeGraphPromise = waitForGraphDataUpdate(api);
    await api.dispatchWebviewMessage({
      type: 'NODE_SELECTED',
      payload: { nodeId: scenario.depth.selectedNodeId },
    });
    const selectedNodeGraph = await selectedNodeGraphPromise;

    assert.deepStrictEqual(
      selectedNodeGraph.nodes.map(node => String(node.id)).sort(),
      scenario.depth.selectedNodeDepthOneNodeIds,
    );
    assert.deepStrictEqual(
      selectedNodeGraph.edges.map(edge => String(edge.id)).sort(),
      scenario.depth.selectedNodeDepthOneEdgeIds,
    );

    await setDepthMode(api, false);
  });
});
