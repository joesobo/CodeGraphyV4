import * as assert from 'assert';
import * as vscode from 'vscode';
import {
  CODEGRAPHY_ROOT_PROVIDER_EDGE_THRESHOLD,
  CODEGRAPHY_ROOT_RENDERED_EDGE_THRESHOLD,
  CODEGRAPHY_ROOT_RENDERED_NODE_THRESHOLD,
  getAPI,
  scenario,
  sleep,
} from './fixture';
import {
  requestVisibleGraphState,
  waitForExtensionMessage,
  waitForExtensionMessageWhere,
} from './messages';

suite('Graph: Workspace Analysis', function () {
  this.timeout(60_000);

  test('CodeGraphy monorepo keeps rendered edges through startup refreshes', async function() {
    if (scenario.name !== 'codegraphy-root') {
      this.skip();
      return;
    }

    this.timeout(600_000);

    const api = await getAPI();
    const graphUpdates: Array<{ nodes: number; edges: number }> = [];
    const startupEvents: string[] = [];
    const subscription = api.onExtensionMessage(message => {
      const type = (message as { type?: string }).type;
      if (type === 'APP_BOOTSTRAP_COMPLETE') {
        startupEvents.push('bootstrap');
        console.log('[e2e:codegraphy-root] APP_BOOTSTRAP_COMPLETE');
        return;
      }

      if (type !== 'GRAPH_DATA_UPDATED') {
        return;
      }

      const graphData = (message as { payload: import('../../../shared/graph/contracts').IGraphData }).payload;
      startupEvents.push(`graph:${graphData.nodes.length}:${graphData.edges.length}`);
      graphUpdates.push({
        nodes: graphData.nodes.length,
        edges: graphData.edges.length,
      });
      console.log(
        `[e2e:codegraphy-root] GRAPH_DATA_UPDATED nodes=${graphData.nodes.length} edges=${graphData.edges.length}`,
      );
    });

    try {
      const loadedGraphPromise = waitForExtensionMessageWhere<{
        type: 'GRAPH_DATA_UPDATED';
        payload: import('../../../shared/graph/contracts').IGraphData;
      }>(
        api,
        'GRAPH_DATA_UPDATED',
        message => message.payload.edges.length > CODEGRAPHY_ROOT_PROVIDER_EDGE_THRESHOLD,
        180_000,
      );
      const bootstrapPromise = waitForExtensionMessage(api, 'APP_BOOTSTRAP_COMPLETE', 180_000);
      await vscode.commands.executeCommand('codegraphy.open');
      await api.refresh();
      const loadedGraphMessage = await loadedGraphPromise;
      await bootstrapPromise;

      assert.ok(
        loadedGraphMessage.payload.edges.length > CODEGRAPHY_ROOT_PROVIDER_EDGE_THRESHOLD,
        `Expected the CodeGraphy monorepo provider graph to keep plugin edges, got ${loadedGraphMessage.payload.edges.length}`,
      );
      const firstBootstrapIndex = startupEvents.indexOf('bootstrap');
      const firstLoadedGraphIndex = startupEvents.findIndex(event => {
        if (!event.startsWith('graph:')) {
          return false;
        }
        const edgeCount = Number(event.split(':')[2] ?? '0');
        return edgeCount > CODEGRAPHY_ROOT_PROVIDER_EDGE_THRESHOLD;
      });
      assert.ok(
        firstLoadedGraphIndex >= 0 && firstBootstrapIndex > firstLoadedGraphIndex,
        `Expected startup bootstrap to complete after the plugin-rich graph was sent. Events: ${startupEvents.join(', ')}`,
      );

      api.refreshSettings();
      await sleep(10_000);

      const afterStartupRefreshGraph = api.getGraphData();
      const afterStartupRefreshVisibleGraph = await requestVisibleGraphState(api, 60_000);
      assert.ok(
        afterStartupRefreshGraph.edges.length > CODEGRAPHY_ROOT_PROVIDER_EDGE_THRESHOLD,
        `Expected provider graph edges to survive startup refreshes, got ${afterStartupRefreshGraph.edges.length}. Updates: ${JSON.stringify(graphUpdates)}`,
      );
      assert.ok(
        afterStartupRefreshVisibleGraph.nodeCount > CODEGRAPHY_ROOT_RENDERED_NODE_THRESHOLD,
        `Expected visible graph nodes to survive settings refreshes, got ${afterStartupRefreshVisibleGraph.nodeCount}. Updates: ${JSON.stringify(graphUpdates)}`,
      );
      assert.ok(
        afterStartupRefreshVisibleGraph.edgeCount > CODEGRAPHY_ROOT_RENDERED_EDGE_THRESHOLD,
        `Expected visible graph edges to survive startup refreshes, got ${afterStartupRefreshVisibleGraph.edgeCount}. Updates: ${JSON.stringify(graphUpdates)}`,
      );

    } finally {
      subscription.dispose();
    }
  });
});
