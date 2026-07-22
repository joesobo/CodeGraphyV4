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
import { requestNodeBounds, waitForGraphDataUpdate } from './messages';

suite('Graph: Depth Mode', function () {
  this.timeout(60_000);

  test('depth mode re-roots around the selected node even without an active editor', async function() {
    const api = await getAPI();
    await ensureIndexedGraph(api);

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
      getFileNodeIds(selectedNodeGraph),
      sortedStrings(scenario.depth.selectedNodeDepthOneNodeIds),
    );
    assert.deepStrictEqual(
      getFileEdgeIds(selectedNodeGraph),
      sortedStrings(scenario.depth.selectedNodeDepthOneEdgeIds),
    );

    const renderedBounds = await requestNodeBounds(api);
    assert.strictEqual(renderedBounds.length, getFileNodeIds(selectedNodeGraph).length);

    await setDepthMode(api, false);
  });


  test('depth mode re-roots around the selected node even when another editor stays active', async function() {
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
    const depthGraph = await depthLimitResetPromise;

    assertIncludesAll(
      getFileNodeIds(depthGraph),
      sortedStrings(scenario.depth.depthOneNodeIds),
      'Depth 1 file nodes before selected-node re-root',
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

    const renderedBounds = await requestNodeBounds(api);
    assert.strictEqual(renderedBounds.length, getFileNodeIds(selectedNodeGraph).length);

    await setDepthMode(api, false);
  });
});
