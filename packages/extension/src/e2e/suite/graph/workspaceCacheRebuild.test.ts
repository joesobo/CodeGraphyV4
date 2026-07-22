import * as assert from 'assert';
import * as fs from 'fs';
import {
  CODEGRAPHY_ROOT_INDEX_TIMEOUT_MS,
  CODEGRAPHY_ROOT_PROVIDER_EDGE_THRESHOLD,
  ensureIndexedGraph,
  getAPI,
  getGraphCachePath,
  resetIndexedGraph,
  scenario,
  sleep,
} from './fixture';
import {
  waitForExtensionMessageWhere,
  waitForGraphIndexStatus,
} from './messages';

suite('Graph: Workspace Analysis', function () {
  this.timeout(60_000);

  test('CodeGraphy monorepo recreates the Graph Cache from a missing cache without dropping rebuilt edges', async function() {
    if (scenario.name !== 'codegraphy-root') {
      this.skip();
      return;
    }

    this.timeout(CODEGRAPHY_ROOT_INDEX_TIMEOUT_MS);

    const api = await getAPI();
    await ensureIndexedGraph(api);

    const graphCachePath = getGraphCachePath();
    assert.ok(fs.existsSync(graphCachePath), `Expected an existing Graph Cache at ${graphCachePath}`);
    fs.unlinkSync(graphCachePath);
    assert.ok(!fs.existsSync(graphCachePath), 'Expected the Graph Cache to be removed before reindexing');

    resetIndexedGraph();
    const progressPhases: string[] = [];
    const graphUpdates: Array<{ nodes: number; edges: number }> = [];
    const subscription = api.onExtensionMessage(message => {
      const type = (message as { type?: string }).type;
      if (type === 'GRAPH_INDEX_PROGRESS') {
        progressPhases.push((message as { payload: { phase: string } }).payload.phase);
        return;
      }

      if (type === 'GRAPH_DATA_UPDATED') {
        const graphData = (message as { payload: import('../../../shared/graph/contracts').IGraphData }).payload;
        graphUpdates.push({
          nodes: graphData.nodes.length,
          edges: graphData.edges.length,
        });
      }
    });

    try {
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
      await sleep(5_000);

      assert.ok(
        fs.existsSync(graphCachePath),
        `Expected manual indexing to recreate the Graph Cache at ${graphCachePath}`,
      );
      assert.ok(
        fs.statSync(graphCachePath).size > 0,
        `Expected the recreated Graph Cache to contain data at ${graphCachePath}`,
      );
      assert.ok(
        rebuiltGraphMessage.payload.edges.length > CODEGRAPHY_ROOT_PROVIDER_EDGE_THRESHOLD,
        `Expected rebuilt graph edges, got ${rebuiltGraphMessage.payload.edges.length}. Updates: ${JSON.stringify(graphUpdates)}`,
      );
      assert.ok(
        progressPhases.includes('Discovering Files'),
        `Expected discovery progress before the cache file exists. Phases: ${progressPhases.join(', ')}`,
      );
      assert.ok(
        progressPhases.includes('Saving Graph Cache'),
        `Expected cache persistence progress while writing graph.sqlite. Phases: ${progressPhases.join(', ')}`,
      );

      const firstRebuiltIndex = graphUpdates.findIndex(
        update => update.edges > CODEGRAPHY_ROOT_PROVIDER_EDGE_THRESHOLD,
      );
      const droppedAfterRebuild = graphUpdates.slice(firstRebuiltIndex + 1).find(
        update => update.nodes > 0 && update.edges === 0,
      );
      assert.strictEqual(
        droppedAfterRebuild,
        undefined,
        `Expected rebuilt plugin edges to stay present after indexing. Updates: ${JSON.stringify(graphUpdates)}`,
      );
    } finally {
      subscription.dispose();
    }
  });
});
