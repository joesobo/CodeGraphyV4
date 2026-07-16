import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  assertIncludesAll,
  ensureIndexedGraph,
  getFileEdgeIds,
  getFileNodeIds,
  getAPI,
  scenario,
  sleep,
  sortedStrings,
} from './fixture';
import { setDepthMode } from './layoutFixture';
import { waitForGraphDataUpdate } from './messages';

suite('Graph: Depth Mode', function () {
  this.timeout(60_000);

  test('depth mode returns to the full graph when the focused node is cleared', async function() {
    const api = await getAPI();
    await ensureIndexedGraph(api);

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


  test('depth mode re-roots again after clearing a selected node and choosing a different node', async function() {
    const api = await getAPI();
    await ensureIndexedGraph(api);

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

    assertIncludesAll(
      getFileNodeIds(firstDepthGraph),
      sortedStrings(scenario.depth.depthOneNodeIds),
      'Depth 1 file nodes before clearing selected node',
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
      getFileNodeIds(selectedNodeGraph),
      sortedStrings(scenario.depth.selectedNodeDepthOneNodeIds),
    );
    assert.deepStrictEqual(
      getFileEdgeIds(selectedNodeGraph),
      sortedStrings(scenario.depth.selectedNodeDepthOneEdgeIds),
    );

    await setDepthMode(api, false);
  });
});
