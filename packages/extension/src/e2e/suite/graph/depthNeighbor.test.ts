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
import { waitForGraphDataUpdate } from './messages';

suite('Graph: Depth Mode', function () {
  this.timeout(60_000);

  test('depth mode stays filtered when re-rooting from the current node to a visible neighbor', async function() {
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
      'Depth 1 file nodes before neighbor re-root',
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

    assertIncludesAll(
      getFileNodeIds(rerootGraph),
      sortedStrings(scenario.depth.rerootDepthOneNodeIds),
      'Re-root file nodes',
    );
    assertIncludesAllEdges(
      getFileEdgeIds(rerootGraph),
      sortedStrings(scenario.depth.rerootDepthOneEdgeIds),
      'Re-root file edges',
    );
    await sleep(2_000);
    rerootMessageSubscription.dispose();

    const graphUpdates = rerootMessages.filter(
      (message): message is { type: 'GRAPH_DATA_UPDATED'; payload: import('../../../shared/graph/contracts').IGraphData } =>
        (message as { type?: string }).type === 'GRAPH_DATA_UPDATED',
    );
    const activeFileUpdates = rerootMessages.filter(
      (message): message is { type: 'ACTIVE_FILE_UPDATED'; payload: { filePath: string | undefined } } =>
        (message as { type?: string }).type === 'ACTIVE_FILE_UPDATED',
    );
    const lastGraphUpdate = graphUpdates.at(-1)?.payload ?? rerootGraph;

    assertIncludesAll(
      getFileNodeIds(lastGraphUpdate),
      sortedStrings(scenario.depth.rerootDepthOneNodeIds),
      'Last re-root file nodes',
    );
    assertIncludesAllEdges(
      getFileEdgeIds(lastGraphUpdate),
      sortedStrings(scenario.depth.rerootDepthOneEdgeIds),
      'Last re-root file edges',
    );
    assert.ok(
      activeFileUpdates.every(update => update.payload.filePath !== undefined),
      `Re-rooting should not clear the focused file. Active file updates: ${JSON.stringify(activeFileUpdates)}`,
    );

    await setDepthMode(api, false);
  });
});
