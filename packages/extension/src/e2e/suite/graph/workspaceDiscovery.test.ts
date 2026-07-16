import * as assert from 'assert';
import * as path from 'path';
import {
  ensureDiscoveredGraph,
  getAPI,
  scenario,
  sleep,
} from './fixture';
import { requestVisibleGraphState, waitForExtensionMessage } from './messages';

suite('Graph: Workspace Analysis', function () {
  this.timeout(60_000);

  test('fresh open shows file nodes', async function() {
    const api = await getAPI();
    const graphUpdates: Array<{ nodes: number; edges: number }> = [];
    const subscription = api.onExtensionMessage(message => {
      if ((message as { type?: string }).type !== 'GRAPH_DATA_UPDATED') {
        return;
      }

      const graphData = (message as { payload: import('../../../shared/graph/contracts').IGraphData }).payload;
      graphUpdates.push({
        nodes: graphData.nodes.length,
        edges: graphData.edges.length,
      });
    });

    try {
      const bootstrapComplete = waitForExtensionMessage(api, 'APP_BOOTSTRAP_COMPLETE', 30_000);
      await ensureDiscoveredGraph(api);
      await bootstrapComplete;
      await sleep(2_000);

      const graphData = api.getGraphData();
      assert.ok(
        graphData.nodes.length > 0,
        `Expected graph nodes after startup settled, got ${graphData.nodes.length}. Updates: ${JSON.stringify(graphUpdates)}`,
      );

      const firstNodeUpdateIndex = graphUpdates.findIndex(update => update.nodes > 0);
      assert.ok(
        firstNodeUpdateIndex >= 0,
        `Expected at least one positive node update during fresh open. Updates: ${JSON.stringify(graphUpdates)}`,
      );
      const droppedUpdate = graphUpdates.slice(firstNodeUpdateIndex + 1).find(update => update.nodes === 0);
      assert.strictEqual(
        droppedUpdate,
        undefined,
        `Expected no later zero-node graph update after initial discovery. Updates: ${JSON.stringify(graphUpdates)}`,
      );

      const visibleGraph = await requestVisibleGraphState(api, 30_000);
      assert.ok(
        visibleGraph.nodeCount > 0,
        `Expected visible graph nodes after startup settled. Visible graph: ${JSON.stringify(visibleGraph)}. Updates: ${JSON.stringify(graphUpdates)}`,
      );

      console.log(
        `[e2e] Fresh graph has ${graphData.nodes.length} node(s) and ${graphData.edges.length} edge(s)`
      );
    } finally {
      subscription.dispose();
    }
  });

  test('fixture files appear as nodes before indexing', async function() {
    const api = await getAPI();
    await ensureDiscoveredGraph(api);

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
});
