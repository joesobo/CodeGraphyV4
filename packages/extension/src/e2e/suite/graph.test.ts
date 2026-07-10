/**
 * Graph data and webview interaction tests.
 *
 * These run inside a real VS Code instance. The extension exports its provider
 * so we can inspect graph data and send/receive webview messages directly,
 * simulating what a user sees in the panel.
 */
import * as assert from 'assert';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import { getCurrentE2EScenario } from '../scenarios';

// The type exported by the extension's activate() function
interface CodeGraphyAPI {
  refresh(): Promise<void>;
  refreshSettings(): void;
  getGraphData(): import('../../shared/graph/contracts').IGraphData;
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
let indexedGraphPromise: Promise<void> | undefined;
let discoveredGraphPromise: Promise<void> | undefined;
const CODEGRAPHY_ROOT_PROVIDER_EDGE_THRESHOLD = 1_000;
const CODEGRAPHY_ROOT_RENDERED_EDGE_THRESHOLD = 1_000;
const CODEGRAPHY_ROOT_RENDERED_NODE_THRESHOLD = 500;
const CODEGRAPHY_ROOT_INDEX_TIMEOUT_MS = 600_000;

function sortedStrings(values: readonly string[]): string[] {
  return [...values].sort();
}

function getFileNodeIds(graphData: import('../../shared/graph/contracts').IGraphData): string[] {
  return sortedStrings(
    graphData.nodes
      .map(node => String(node.id))
      .filter(nodeId => !nodeId.includes('#')),
  );
}

function getFileEdgeIds(graphData: import('../../shared/graph/contracts').IGraphData): string[] {
  return sortedStrings(
    graphData.edges
      .filter(edge => !String(edge.from).includes('#') && !String(edge.to).includes('#'))
      .map(edge => String(edge.id)),
  );
}

function assertIncludesAll(
  actualIds: readonly string[],
  expectedIds: readonly string[],
  label: string,
): void {
  const missingIds = expectedIds.filter(expectedId => !actualIds.includes(expectedId));
  assert.deepStrictEqual(missingIds, [], `${label} missing from ${actualIds.join(', ')}`);
}

function edgeIdMatchesExpected(actualId: string, expectedId: string): boolean {
  return actualId === expectedId || actualId.startsWith(`${expectedId}:`);
}

function assertIncludesAllEdges(
  actualIds: readonly string[],
  expectedIds: readonly string[],
  label: string,
): void {
  const missingIds = expectedIds.filter(
    expectedId => !actualIds.some(actualId => edgeIdMatchesExpected(actualId, expectedId)),
  );
  assert.deepStrictEqual(missingIds, [], `${label} missing from ${actualIds.join(', ')}`);
}

function getScenarioPackagePlugin(): { pluginId: string; packageName: string } {
  switch (scenario.name) {
    case 'typescript':
      return {
        pluginId: 'codegraphy.typescript',
        packageName: '@codegraphy-dev/plugin-typescript',
      };
    case 'godot':
      return {
        pluginId: 'codegraphy.gdscript',
        packageName: '@codegraphy-dev/plugin-godot',
      };
    case 'codegraphy-root':
      throw new Error('The CodeGraphy root scenario does not have a single package plugin');
  }
}

function getWorkspaceRoot(): string {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  assert.ok(workspaceRoot, 'Expected an open workspace folder');
  return workspaceRoot;
}

function getGraphCachePath(): string {
  return path.join(getWorkspaceRoot(), '.codegraphy', 'graph.lbug');
}

function getRepoMetaPath(): string {
  return path.join(getWorkspaceRoot(), '.codegraphy', 'meta.json');
}

function unlinkIfExists(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

function getIndexTimeoutMs(): number {
  return scenario.name === 'codegraphy-root'
    ? CODEGRAPHY_ROOT_INDEX_TIMEOUT_MS
    : 30_000;
}

suite('Graph: Workspace Analysis', function () {
  this.timeout(60_000);

  test('fresh open shows file nodes', async function() {
    const api = await getAPI();
    const graphUpdates: Array<{ nodes: number; edges: number }> = [];
    const subscription = api.onExtensionMessage(message => {
      if ((message as { type?: string }).type !== 'GRAPH_DATA_UPDATED') {
        return;
      }

      const graphData = (message as { payload: import('../../shared/graph/contracts').IGraphData }).payload;
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

      const graphData = (message as { payload: import('../../shared/graph/contracts').IGraphData }).payload;
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
        payload: import('../../shared/graph/contracts').IGraphData;
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

    indexedGraphPromise = undefined;
    const progressPhases: string[] = [];
    const graphUpdates: Array<{ nodes: number; edges: number }> = [];
    const subscription = api.onExtensionMessage(message => {
      const type = (message as { type?: string }).type;
      if (type === 'GRAPH_INDEX_PROGRESS') {
        progressPhases.push((message as { payload: { phase: string } }).payload.phase);
        return;
      }

      if (type === 'GRAPH_DATA_UPDATED') {
        const graphData = (message as { payload: import('../../shared/graph/contracts').IGraphData }).payload;
        graphUpdates.push({
          nodes: graphData.nodes.length,
          edges: graphData.edges.length,
        });
      }
    });

    try {
      const rebuiltGraph = waitForExtensionMessageWhere<{
        type: 'GRAPH_DATA_UPDATED';
        payload: import('../../shared/graph/contracts').IGraphData;
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
        `Expected cache persistence progress while writing graph.lbug. Phases: ${progressPhases.join(', ')}`,
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

    indexedGraphPromise = undefined;
    discoveredGraphPromise = undefined;

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

      const graphData = (message as { payload: import('../../shared/graph/contracts').IGraphData }).payload;
      graphUpdates.push({
        nodes: graphData.nodes.length,
        edges: graphData.edges.length,
      });
    });

    try {
      const coldGraphPromise = waitForExtensionMessageWhere<{
        type: 'GRAPH_DATA_UPDATED';
        payload: import('../../shared/graph/contracts').IGraphData;
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
        payload: import('../../shared/graph/contracts').IGraphData;
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
        payload: import('../../shared/graph/contracts').IGraphData;
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

function waitForExtensionMessageWhere<TMessage>(
  api: CodeGraphyAPI,
  type: string,
  predicate: (message: TMessage) => boolean,
  timeoutMs: number,
): Promise<TMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for webview message: ${type}`)),
      timeoutMs,
    );
    const disposable = api.onExtensionMessage((msg: unknown) => {
      const message = msg as TMessage & { type?: string };
      if (message.type !== type || !predicate(message)) {
        return;
      }

      clearTimeout(timer);
      disposable.dispose();
      resolve(message);
    });
  });
}

async function waitForGraphIndexStatus(
  api: CodeGraphyAPI,
  hasIndex: boolean,
  timeoutMs = 15_000,
): Promise<void> {
  await waitForExtensionMessageWhere<{ type: 'GRAPH_INDEX_STATUS_UPDATED'; payload: { hasIndex: boolean } }>(
    api,
    'GRAPH_INDEX_STATUS_UPDATED',
    (message) => message.payload.hasIndex === hasIndex,
    timeoutMs,
  );
}

async function ensureIndexedGraph(api: CodeGraphyAPI): Promise<void> {
  await vscode.commands.executeCommand('codegraphy.open');

  indexedGraphPromise ??= (async () => {
    const timeoutMs = getIndexTimeoutMs();
    const graphUpdated = scenario.name === 'codegraphy-root'
      ? waitForExtensionMessageWhere<{
        type: 'GRAPH_DATA_UPDATED';
        payload: import('../../shared/graph/contracts').IGraphData;
      }>(
        api,
        'GRAPH_DATA_UPDATED',
        message => message.payload.edges.length > CODEGRAPHY_ROOT_PROVIDER_EDGE_THRESHOLD,
        timeoutMs,
      )
      : waitForExtensionMessage(api, 'GRAPH_DATA_UPDATED', timeoutMs);
    const indexUpdated = waitForGraphIndexStatus(api, true, timeoutMs);
    await api.dispatchWebviewMessage({ type: 'INDEX_GRAPH' });
    await Promise.all([graphUpdated, indexUpdated]);
    await sleep(500);
  })();

  await indexedGraphPromise;
  await sleep(250);
}

async function ensureDiscoveredGraph(api: CodeGraphyAPI): Promise<void> {
  discoveredGraphPromise ??= (async () => {
    await vscode.commands.executeCommand('codegraphy.open');
    await waitForDiscoveredGraph(api);
  })();

  await discoveredGraphPromise;
}

async function waitForDiscoveredGraph(
  api: CodeGraphyAPI,
  timeoutMs = 15_000,
): Promise<import('../../shared/graph/contracts').IGraphData> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const graphData = api.getGraphData();
    if (graphData.nodes.length > 0) {
      return graphData;
    }

    await sleep(250);
  }

  const graphData = api.getGraphData();
  throw new Error(
    `Timed out waiting for discovered graph: ${graphData.nodes.length} node(s), ${graphData.edges.length} edge(s)`,
  );
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

function requestWebviewMessage(
  api: CodeGraphyAPI,
  responseType: string,
  requestMessage: unknown,
  timeoutMs: number,
  retryMs = 1_000,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      clearInterval(interval);
      disposable.dispose();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for webview message: ${responseType}`));
    }, timeoutMs);
    const interval = setInterval(() => {
      api.sendToWebview(requestMessage);
    }, retryMs);
    const disposable = api.onWebviewMessage((msg: unknown) => {
      if ((msg as { type: string }).type === responseType) {
        cleanup();
        resolve(msg);
      }
    });

    api.sendToWebview(requestMessage);
  });
}

async function waitForGraphDataUpdate(
  api: CodeGraphyAPI,
  timeoutMs = 15_000,
): Promise<import('../../shared/graph/contracts').IGraphData> {
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
    edgeCount: number;
    edgeIds: string[];
    nodeCount: number;
  };
}

interface VisibleGraphStateResponse {
  payload: {
    edgeCount: number;
    edgeIds: string[];
    nodeCount: number;
    nodes: Array<{ id: string; nodeType?: string; color: string }>;
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

async function requestVisibleGraphState(
  api: CodeGraphyAPI,
  timeoutMs = 5_000,
): Promise<VisibleGraphStateResponse['payload']> {
  const stateMessage = await requestWebviewMessage(
    api,
    'VISIBLE_GRAPH_STATE_RESPONSE',
    { type: 'GET_VISIBLE_GRAPH_STATE' },
    timeoutMs,
  ) as VisibleGraphStateResponse;
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
    await ensureIndexedGraph(api);
    await waitForStableNodeBounds(api, 10_000);
  });
});

suite('Graph: No Node Overlap After Stabilization', function () {
  this.timeout(30_000);

  test('no two nodes overlap after physics stabilizes', async function() {
    const api = await getAPI();
    await ensureIndexedGraph(api);

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
    await ensureIndexedGraph(api);

    const updatePromise = waitForExtensionMessage(api, 'GRAPH_DATA_UPDATED', 15_000);
    void api.dispatchWebviewMessage({ type: 'WEBVIEW_READY', payload: null });
    await updatePromise;
  });

  test('FIT_VIEW command sends FIT_VIEW message to webview', async function() {
    const api = await getAPI();
    await ensureIndexedGraph(api);

    const fitViewPromise = waitForExtensionMessage(api, 'FIT_VIEW', 10_000);
    void vscode.commands.executeCommand('codegraphy.fitView');
    await fitViewPromise;
  });

});

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
      (message): message is { type: 'GRAPH_DATA_UPDATED'; payload: import('../../shared/graph/contracts').IGraphData } =>
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
