/**
 * Plugin-specific e2e tests.
 *
 * Each suite opens a fixture workspace for a specific language and verifies
 * that the extension produces nodes and edges for that language's files.
 *
 * NOTE: These tests run against the TypeScript fixture workspace by default
 * (the workspace opened by runTest.ts). For multi-language verification we
 * inspect the example project files directly through the plugin API bridge.
 */
import * as assert from 'assert';
import * as vscode from 'vscode';
import { getCurrentE2EScenario } from '../scenarios';

interface CodeGraphyAPI {
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
const pluginSuiteName = `Plugin: ${scenario.name}`;
let indexedGraphPromise: Promise<void> | undefined;

function waitForExtensionMessageWhere<TMessage>(
  api: CodeGraphyAPI,
  type: string,
  predicate: (message: TMessage) => boolean,
  timeoutMs: number,
): Promise<TMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for extension message: ${type}`)),
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
    const graphUpdated = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for GRAPH_DATA_UPDATED')), 30_000);
      const disposable = api.onExtensionMessage((msg: unknown) => {
        const message = msg as { type?: string };
        if (message.type !== 'GRAPH_DATA_UPDATED') {
          return;
        }

        clearTimeout(timer);
        disposable.dispose();
        resolve();
      });
    });
    const indexUpdated = waitForGraphIndexStatus(api, true, 30_000);
    await api.dispatchWebviewMessage({ type: 'INDEX_GRAPH' });
    await Promise.all([graphUpdated, indexUpdated]);
    await sleep(500);
  })();

  await indexedGraphPromise;
  await sleep(250);
}

// ── Active plugin scenario ─────────────────────────────────────────────────

suite(pluginSuiteName, function () {
  this.timeout(60_000);

  test('scenario fixture files appear as graph nodes', async function() {
    const api = await getAPI();
    await ensureIndexedGraph(api);

    const graphData = api.getGraphData();
    assert.ok(graphData.nodes.length > 0, `Expected ${scenario.name} nodes in the graph`);

    const scenarioNodes = graphData.nodes.filter(
      (n) => typeof n.id === 'string' && n.id.endsWith(scenario.graphNodeExtension)
    );
    assert.ok(
      scenarioNodes.length > 0,
      `Expected ${scenario.graphNodeExtension} nodes, found: ${graphData.nodes.map(n => n.id).join(', ')}`
    );
  });

  test('scenario import edges are detected', async function() {
    const api = await getAPI();
    await ensureIndexedGraph(api);

    const graphData = api.getGraphData();
    const edgeIds = graphData.edges.map((edge) => String(edge.id));
    for (const edgeId of scenario.minimumExpectedEdgeIds) {
      assert.ok(edgeIds.includes(edgeId), `Expected edge '${edgeId}' in ${scenario.name} graph`);
    }
  });

  test('node IDs are workspace-relative paths (no absolute paths)', async function() {
    const api = await getAPI();
    await ensureIndexedGraph(api);

    const graphData = api.getGraphData();
    for (const node of graphData.nodes) {
      const id = String(node.id);
      assert.ok(
        !id.startsWith('/') && !id.match(/^[A-Z]:\\/),
        `Node ID should be relative, got: ${id}`
      );
    }
  });
});

// ── Favorites ──────────────────────────────────────────────────────────────

suite('Plugin: Favorites', function () {
  this.timeout(30_000);

  test('TOGGLE_FAVORITE adds a file to favorites', async function() {
    const api = await getAPI();
    await ensureIndexedGraph(api);

    const graphData = api.getGraphData();
    if (graphData.nodes.length === 0) {
      console.log('[e2e] No nodes available, skipping favorites test');
      return;
    }

    const firstNodeId = String(graphData.nodes[0].id);

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Timed out waiting for FAVORITES_UPDATED')),
        10_000
      );

      const disposable = api.onExtensionMessage((msg: unknown) => {
        const message = msg as { type: string; payload: unknown };
        if (message.type === 'FAVORITES_UPDATED') {
          clearTimeout(timer);
          disposable.dispose();
          resolve();
        }
      });

      void api.dispatchWebviewMessage({
        type: 'TOGGLE_FAVORITE',
        payload: { paths: [firstNodeId] },
      });
    });
  });
});
