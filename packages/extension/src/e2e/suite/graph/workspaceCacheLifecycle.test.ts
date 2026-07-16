import * as assert from 'assert';
import * as fs from 'fs';
import * as vscode from 'vscode';
import {
  CODEGRAPHY_ROOT_INDEX_TIMEOUT_MS,
  CODEGRAPHY_ROOT_PROVIDER_EDGE_THRESHOLD,
  CODEGRAPHY_ROOT_RENDERED_EDGE_THRESHOLD,
  CODEGRAPHY_ROOT_RENDERED_NODE_THRESHOLD,
  getAPI,
  getGraphCachePath,
  getRepoMetaPath,
  resetGraphReadiness,
  scenario,
  unlinkIfExists,
} from './fixture';
import {
  requestVisibleGraphState,
  waitForExtensionMessage,
  waitForExtensionMessageWhere,
  waitForGraphIndexStatus,
} from './messages';

suite('Graph: Workspace Analysis', function () {
  this.timeout(60_000);

  test('CodeGraphy monorepo cold cache startup indexes explicitly and reopens warm from the Graph Cache', async function() {
    if (scenario.name !== 'codegraphy-root') {
      this.skip();
      return;
    }

    this.timeout(CODEGRAPHY_ROOT_INDEX_TIMEOUT_MS);

    const graphCachePath = getGraphCachePath();
    const repoMetaPath = getRepoMetaPath();
    unlinkIfExists(repoMetaPath);
    unlinkIfExists(graphCachePath);
    assert.ok(!fs.existsSync(repoMetaPath), 'Expected repo meta to be removed before cold startup');
    assert.ok(!fs.existsSync(graphCachePath), 'Expected the Graph Cache to be removed before cold startup');

    resetGraphReadiness();

    const api = await getAPI();
    const progressPhases: string[] = [];
    const graphUpdates: Array<{ nodes: number; edges: number }> = [];
    const indexStatuses: Array<{ hasIndex: boolean; freshness: string; detail: string }> = [];
    let sawSettingsHydrated = false;
    let sawFiltersHydrated = false;
    const subscription = api.onExtensionMessage(message => {
      const type = (message as { type?: string }).type;
      if (type === 'SETTINGS_UPDATED') {
        sawSettingsHydrated = true;
        return;
      }

      if (type === 'FILTER_PATTERNS_UPDATED') {
        sawFiltersHydrated = true;
        return;
      }

      if (type === 'GRAPH_INDEX_STATUS_UPDATED') {
        const payload = (message as {
          payload: { hasIndex: boolean; freshness: string; detail: string };
        }).payload;
        indexStatuses.push(payload);
        return;
      }

      if (type === 'GRAPH_INDEX_PROGRESS') {
        progressPhases.push((message as { payload: { phase: string } }).payload.phase);
        return;
      }

      if (type !== 'GRAPH_DATA_UPDATED') {
        return;
      }

      const graphData = (message as { payload: import('../../../shared/graph/contracts').IGraphData }).payload;
      graphUpdates.push({
        nodes: graphData.nodes.length,
        edges: graphData.edges.length,
      });
    });

    try {
      const coldGraphPromise = waitForExtensionMessageWhere<{
        type: 'GRAPH_DATA_UPDATED';
        payload: import('../../../shared/graph/contracts').IGraphData;
      }>(
        api,
        'GRAPH_DATA_UPDATED',
        message => message.payload.nodes.length > 0,
        180_000,
      );
      const coldBootstrap = waitForExtensionMessage(api, 'APP_BOOTSTRAP_COMPLETE', 180_000);

      await vscode.commands.executeCommand('codegraphy.open');

      const [coldGraphMessage] = await Promise.all([
        coldGraphPromise,
        coldBootstrap,
      ]);
      const coldVisibleGraph = await requestVisibleGraphState(api, 60_000);

      assert.ok(sawSettingsHydrated, 'Expected cold startup to hydrate settings before leaving loading');
      assert.ok(sawFiltersHydrated, 'Expected cold startup to hydrate filter patterns before leaving loading');
      assert.ok(
        indexStatuses.some(status => !status.hasIndex && status.freshness === 'missing'),
        `Expected cold startup to report a missing Graph Cache before explicit indexing. Statuses: ${JSON.stringify(indexStatuses)}`,
      );
      assert.ok(
        coldGraphMessage.payload.nodes.length > 0,
        `Expected cold startup to discover visible file nodes. Updates: ${JSON.stringify(graphUpdates)}`,
      );
      assert.strictEqual(
        coldGraphMessage.payload.edges.length,
        0,
        `Expected cold startup without a Graph Cache to show no edges. Updates: ${JSON.stringify(graphUpdates)}`,
      );
      assert.ok(
        coldVisibleGraph.nodeCount > CODEGRAPHY_ROOT_RENDERED_NODE_THRESHOLD,
        `Expected cold startup visible graph nodes. Visible graph: ${JSON.stringify(coldVisibleGraph)}`,
      );
      assert.ok(
        coldVisibleGraph.nodes.every(node => (node.nodeType ?? 'file') === 'file'),
        `Expected cold startup visible graph to contain only file nodes. Visible graph: ${JSON.stringify(coldVisibleGraph)}`,
      );
      assert.ok(
        coldVisibleGraph.nodes.every(node => typeof node.color === 'string' && node.color.startsWith('#')),
        `Expected cold startup visible file nodes to have graph colors. Visible graph: ${JSON.stringify(coldVisibleGraph)}`,
      );
      assert.strictEqual(
        coldVisibleGraph.edgeCount,
        0,
        `Expected cold startup visible graph to have no edges. Visible graph: ${JSON.stringify(coldVisibleGraph)}`,
      );

      const rebuiltGraph = waitForExtensionMessageWhere<{
        type: 'GRAPH_DATA_UPDATED';
        payload: import('../../../shared/graph/contracts').IGraphData;
      }>(
        api,
        'GRAPH_DATA_UPDATED',
        message => message.payload.edges.length > CODEGRAPHY_ROOT_PROVIDER_EDGE_THRESHOLD,
        CODEGRAPHY_ROOT_INDEX_TIMEOUT_MS,
      );
      const indexReady = waitForGraphIndexStatus(api, true, CODEGRAPHY_ROOT_INDEX_TIMEOUT_MS);
      await api.dispatchWebviewMessage({ type: 'INDEX_GRAPH' });
      const rebuiltGraphMessage = await rebuiltGraph;
      await indexReady;

      assert.ok(
        fs.existsSync(repoMetaPath),
        `Expected explicit indexing to recreate repo meta at ${repoMetaPath}`,
      );
      assert.ok(
        fs.existsSync(graphCachePath),
        `Expected explicit indexing to recreate the Graph Cache at ${graphCachePath}`,
      );
      assert.ok(
        progressPhases.includes('Discovering Files'),
        `Expected indexing to publish discovery progress. Phases: ${progressPhases.join(', ')}`,
      );
      assert.ok(
        progressPhases.includes('Saving Graph Cache'),
        `Expected indexing to publish Graph Cache persistence progress. Phases: ${progressPhases.join(', ')}`,
      );
      assert.ok(
        rebuiltGraphMessage.payload.edges.length > CODEGRAPHY_ROOT_PROVIDER_EDGE_THRESHOLD,
        `Expected explicit indexing to publish relationship edges. Updates: ${JSON.stringify(graphUpdates)}`,
      );

      const warmGraph = waitForExtensionMessageWhere<{
        type: 'GRAPH_DATA_UPDATED';
        payload: import('../../../shared/graph/contracts').IGraphData;
      }>(
        api,
        'GRAPH_DATA_UPDATED',
        message => message.payload.edges.length > CODEGRAPHY_ROOT_PROVIDER_EDGE_THRESHOLD,
        60_000,
      );
      const warmBootstrap = waitForExtensionMessage(api, 'APP_BOOTSTRAP_COMPLETE', 60_000);
      await api.dispatchWebviewMessage({ type: 'WEBVIEW_READY', payload: null });
      const [warmGraphMessage] = await Promise.all([warmGraph, warmBootstrap]);
      const warmVisibleGraph = await requestVisibleGraphState(api, 60_000);

      assert.ok(
        warmGraphMessage.payload.edges.length > CODEGRAPHY_ROOT_PROVIDER_EDGE_THRESHOLD,
        `Expected warm startup to publish edges from the Graph Cache. Updates: ${JSON.stringify(graphUpdates)}`,
      );
      assert.ok(
        warmVisibleGraph.nodeCount > CODEGRAPHY_ROOT_RENDERED_NODE_THRESHOLD,
        `Expected warm visible graph nodes from the Graph Cache. Visible graph: ${JSON.stringify(warmVisibleGraph)}`,
      );
      assert.ok(
        warmVisibleGraph.edgeCount > CODEGRAPHY_ROOT_RENDERED_EDGE_THRESHOLD,
        `Expected warm visible graph edges from the Graph Cache. Visible graph: ${JSON.stringify(warmVisibleGraph)}`,
      );
    } finally {
      subscription.dispose();
    }
  });
});
