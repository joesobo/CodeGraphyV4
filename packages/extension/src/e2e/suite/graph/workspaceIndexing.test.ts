import * as assert from 'assert';
import {
  assertIncludesAllEdges,
  CODEGRAPHY_ROOT_PROVIDER_EDGE_THRESHOLD,
  ensureIndexedGraph,
  getAPI,
  getIndexTimeoutMs,
  getScenarioPackagePlugin,
  scenario,
  sleep,
} from './fixture';
import {
  requestGraphRuntimeState,
  waitForExtensionMessage,
  waitForGraphIndexStatus,
} from './messages';

suite('Graph: Workspace Analysis', function () {
  this.timeout(60_000);

  test('manual graph indexing creates scenario edges', async function() {
    this.timeout(getIndexTimeoutMs());

    const api = await getAPI();
    await ensureIndexedGraph(api);

    const graphData = api.getGraphData();
    if (scenario.name === 'codegraphy-root') {
      assert.ok(
        graphData.edges.length > CODEGRAPHY_ROOT_PROVIDER_EDGE_THRESHOLD,
        `Expected the CodeGraphy monorepo index to rebuild plugin edges, got ${graphData.edges.length}`,
      );
      return;
    }

    const edgeIds = graphData.edges.map((edge) => String(edge.id));
    assertIncludesAllEdges(
      edgeIds,
      scenario.minimumExpectedEdgeIds,
      `Scenario '${scenario.name}' edges`,
    );
  });


  test('manual refresh keeps the graph indexed and rebuilds scenario edges', async function() {
    const api = await getAPI();
    await ensureIndexedGraph(api);

    const graphUpdated = waitForExtensionMessage(api, 'GRAPH_DATA_UPDATED', 30_000);
    const indexUpdated = waitForGraphIndexStatus(api, true, 30_000);
    await api.dispatchWebviewMessage({ type: 'REFRESH_GRAPH' });
    await Promise.all([graphUpdated, indexUpdated]);

    const graphData = api.getGraphData();
    const edgeIds = graphData.edges.map((edge) => String(edge.id));
    assertIncludesAllEdges(
      edgeIds,
      scenario.minimumExpectedEdgeIds,
      `Scenario '${scenario.name}' refreshed edges`,
    );
  });


  test('scenario edges are detected between fixture files', async function() {
    const api = await getAPI();
    await ensureIndexedGraph(api);

    const graphData = api.getGraphData();
    const edgeIds = graphData.edges.map((edge) => String(edge.id));
    assertIncludesAllEdges(
      edgeIds,
      scenario.minimumExpectedEdgeIds,
      `Scenario '${scenario.name}' detected fixture edges`,
    );

    console.log(`[e2e:${scenario.name}] Edges:`, graphData.edges.map((e) => `${e.from} → ${e.to}`).join(', '));
  });


  test('rendered graph keeps scenario edges after delayed updates and refresh', async function() {
    const api = await getAPI();
    await ensureIndexedGraph(api);

    const initialRuntime = await requestGraphRuntimeState(api);
    assertIncludesAllEdges(
      initialRuntime.edgeIds,
      scenario.minimumExpectedEdgeIds,
      `Scenario '${scenario.name}' initially rendered edges`,
    );

    await sleep(5_000);

    const afterDelayRuntime = await requestGraphRuntimeState(api);
    assertIncludesAllEdges(
      afterDelayRuntime.edgeIds,
      scenario.minimumExpectedEdgeIds,
      `Scenario '${scenario.name}' delayed rendered edges`,
    );

    const graphUpdated = waitForExtensionMessage(api, 'GRAPH_DATA_UPDATED', 30_000);
    const indexUpdated = waitForGraphIndexStatus(api, true, 30_000);
    await api.dispatchWebviewMessage({ type: 'REFRESH_GRAPH' });
    await Promise.all([graphUpdated, indexUpdated]);
    await sleep(2_000);

    const afterRefreshRuntime = await requestGraphRuntimeState(api);
    assertIncludesAllEdges(
      afterRefreshRuntime.edgeIds,
      scenario.minimumExpectedEdgeIds,
      `Scenario '${scenario.name}' refreshed rendered edges`,
    );
  });


  test('rendered graph keeps scenario edges after reloading an enabled package plugin', async function() {
    const api = await getAPI();
    await ensureIndexedGraph(api);

    const plugin = getScenarioPackagePlugin();
    const graphUpdated = waitForExtensionMessage(api, 'GRAPH_DATA_UPDATED', 30_000);
    await api.dispatchWebviewMessage({
      type: 'TOGGLE_PLUGIN',
      payload: {
        pluginId: plugin.pluginId,
        packageName: plugin.packageName,
        enabled: true,
      },
    });
    await graphUpdated;
    await sleep(5_000);

    const runtimeState = await requestGraphRuntimeState(api);
    assertIncludesAllEdges(
      runtimeState.edgeIds,
      scenario.minimumExpectedEdgeIds,
      `Scenario '${scenario.name}' rendered edges after package plugin reload`,
    );
  });
});
