import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  assertIncludesAll,
  assertIncludesAllEdges,
  ensureIndexedGraph,
  getFileEdgeIds,
  getFileNodeIds,
  getAPI,
  scenario,
  sleep,
  sortedStrings,
} from './fixture';
import { setDepthMode } from './layoutFixture';
import { requestNodeBounds, waitForGraphDataUpdate } from './messages';

suite('Graph: Depth Mode', function () {
  this.timeout(60_000);

  test('depth mode falls back to the full graph when no file is active', async function() {
    const api = await getAPI();
    await ensureIndexedGraph(api);

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


  test('depth mode filters the graph around the active file and still renders bounds', async function() {
    const api = await getAPI();
    await ensureIndexedGraph(api);

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
    const depthOneNodeIds = getFileNodeIds(depthOneGraph);

    assertIncludesAll(
      depthOneNodeIds,
      sortedStrings(scenario.depth.depthOneNodeIds),
      'Depth 1 file nodes',
    );
    assertIncludesAllEdges(
      getFileEdgeIds(depthOneGraph),
      sortedStrings(scenario.depth.depthOneEdgeIds),
      'Depth 1 file edges',
    );

    const depthOneBounds = await requestNodeBounds(api);
    assert.strictEqual(depthOneBounds.length, getFileNodeIds(depthOneGraph).length);

    const depthTwoPromise = waitForGraphDataUpdate(api);
    await api.dispatchWebviewMessage({
      type: 'CHANGE_DEPTH_LIMIT',
      payload: { depthLimit: 2 },
    });
    const depthTwoGraph = await depthTwoPromise;
    const depthTwoNodeIds = getFileNodeIds(depthTwoGraph);
    assertIncludesAll(
      depthTwoNodeIds,
      sortedStrings(scenario.depth.depthTwoNodeIds),
      'Depth 2 file nodes',
    );
    for (const excludedNodeId of scenario.depth.excludedAtDepthTwo) {
      assert.ok(
        !depthTwoNodeIds.includes(excludedNodeId),
        `depth 2 should exclude '${excludedNodeId}'`
      );
    }

    const depthTwoBounds = await requestNodeBounds(api);
    assert.strictEqual(depthTwoBounds.length, getFileNodeIds(depthTwoGraph).length);

    await setDepthMode(api, false);
  });
});
