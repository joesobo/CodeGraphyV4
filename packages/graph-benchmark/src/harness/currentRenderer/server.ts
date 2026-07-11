import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http, { type ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { IGraphData } from '@codegraphy-dev/plugin-api';

import type { BenchmarkRenderer } from '../../cli/arguments';
import type { BenchmarkFixture } from '../../fixture/presets';

export interface GraphBenchmarkServer {
  url: string;
  close(): Promise<void>;
}

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../..',
);
const webviewDist = path.join(repositoryRoot, 'dist', 'webview');

function benchmarkHtml(fixture: BenchmarkFixture, renderer: BenchmarkRenderer): string {
  const identity = JSON.stringify({
    renderer,
    fixtureHash: fixture.fixtureHash,
    nodeCount: fixture.summary.nodeCount,
    edgeCount: fixture.summary.edgeCount,
  });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CodeGraphy Graph Benchmark</title>
    <link rel="stylesheet" href="/dist/webview/index.css" />
    <style>html, body, #root { height: 100%; margin: 0; overflow: hidden; }</style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      (() => {
        window.__CODEGRAPHY_ENABLE_GRAPH_DEBUG__ = true;
        const identity = ${identity};
        const state = {
          error: null,
          lastHoveredNodeId: null,
          ready: false,
          result: null,
          stabilizationCount: 0,
          start: null,
          startedAt: null,
        };
        window.__CODEGRAPHY_GRAPH_BENCHMARK__ = state;

        const postToWebview = (message) => window.postMessage(message, '*');
        const publishGraph = async () => {
          try {
            const response = await fetch('/fixture.json');
            if (!response.ok) throw new Error('Fixture request failed: ' + response.status);
            const graph = await response.json();
            postToWebview({
              type: 'GRAPH_INDEX_STATUS_UPDATED',
              payload: { hasIndex: true },
            });
            postToWebview({
              type: 'SETTINGS_UPDATED',
              payload: { bidirectionalEdges: 'separate', showOrphans: true },
            });
            state.startedAt = performance.now();
            postToWebview({ type: 'GRAPH_DATA_UPDATED', payload: graph });
            postToWebview({ type: 'APP_BOOTSTRAP_COMPLETE' });
          } catch (error) {
            state.error = error instanceof Error ? error.message : String(error);
          }
        };

        state.start = publishGraph;
        window.acquireVsCodeApi = () => ({
          getState: () => null,
          postMessage: (message) => {
            if (message?.type === 'WEBVIEW_READY') {
              state.ready = true;
            }
            if (message?.type === 'PHYSICS_STABILIZED' && state.startedAt !== null) {
              state.stabilizationCount += 1;
              state.result = {
                ...identity,
                settleTimeMs: performance.now() - state.startedAt,
              };
            }
            if (
              message?.type === 'GRAPH_INTERACTION'
              && message.payload?.event === 'graph:nodeHover'
              && message.payload?.data?.node
            ) {
              state.lastHoveredNodeId = message.payload.data.node.id ?? null;
            }
          },
          setState: () => {},
        });
      })();
    </script>
    <script type="module" src="/dist/webview/index.js"></script>
  </body>
</html>`;
}

async function write(response: ServerResponse, chunk: string): Promise<void> {
  if (!response.write(chunk)) await once(response, 'drain');
}

async function writeRecords(
  response: ServerResponse,
  records: readonly unknown[],
): Promise<void> {
  const batchSize = 1_000;
  for (let start = 0; start < records.length; start += batchSize) {
    const batch = records
      .slice(start, start + batchSize)
      .map((record) => JSON.stringify(record));
    const prefix = start === 0 ? '' : ',';
    await write(response, `${prefix}${batch.join(',')}`);
  }
}

async function writeGraph(response: ServerResponse, graph: IGraphData): Promise<void> {
  response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  await write(response, '{"nodes":[');
  await writeRecords(response, graph.nodes);
  await write(response, '],"edges":[');
  await writeRecords(response, graph.edges);
  response.end(']}');
}

async function serveAsset(response: ServerResponse, fileName: string): Promise<void> {
  const extension = path.extname(fileName);
  const contentType = extension === '.css'
    ? 'text/css; charset=utf-8'
    : 'application/javascript; charset=utf-8';
  try {
    const content = await readFile(path.join(webviewDist, fileName));
    response.writeHead(200, { 'content-type': contentType });
    response.end(content);
  } catch {
    response.writeHead(404).end('Not found');
  }
}

export async function startGraphBenchmarkServer(
  fixture: BenchmarkFixture,
  renderer: BenchmarkRenderer = 'current',
): Promise<GraphBenchmarkServer> {
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (requestUrl.pathname === '/graph-benchmark') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(benchmarkHtml(fixture, renderer));
      return;
    }
    if (requestUrl.pathname === '/fixture.json') {
      void writeGraph(response, fixture.graph);
      return;
    }
    if (requestUrl.pathname.startsWith('/dist/webview/')) {
      void serveAsset(response, path.basename(requestUrl.pathname));
      return;
    }
    response.writeHead(404).end('Not found');
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Graph benchmark server did not receive a TCP address');
  }

  return {
    url: `http://127.0.0.1:${address.port}/graph-benchmark`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
}
