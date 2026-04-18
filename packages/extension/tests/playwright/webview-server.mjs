import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..', '..', '..', '..');
const webviewDist = path.join(root, 'dist', 'webview');
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const fullGraph = {
  nodes: [
    { id: 'packages/app/src/index.ts', label: 'index.ts', color: '#38bdf8', x: 0, y: 0 },
    { id: 'packages/app/src/utils.ts', label: 'utils.ts', color: '#38bdf8', x: 100, y: -60 },
    { id: 'packages/shared/src/types.ts', label: 'types.ts', color: '#22c55e', x: 100, y: 60 },
    { id: 'packages/feature-depth/src/deep.ts', label: 'deep.ts', color: '#f59e0b', x: 220, y: -60 },
    { id: 'packages/feature-depth/src/leaf.ts', label: 'leaf.ts', color: '#f59e0b', x: 340, y: -60 },
  ],
  edges: [
    {
      id: 'packages/app/src/index.ts->packages/app/src/utils.ts',
      from: 'packages/app/src/index.ts',
      to: 'packages/app/src/utils.ts',
    },
    {
      id: 'packages/app/src/index.ts->packages/shared/src/types.ts',
      from: 'packages/app/src/index.ts',
      to: 'packages/shared/src/types.ts',
    },
    {
      id: 'packages/app/src/utils.ts->packages/shared/src/types.ts',
      from: 'packages/app/src/utils.ts',
      to: 'packages/shared/src/types.ts',
    },
    {
      id: 'packages/app/src/utils.ts->packages/feature-depth/src/deep.ts',
      from: 'packages/app/src/utils.ts',
      to: 'packages/feature-depth/src/deep.ts',
    },
    {
      id: 'packages/feature-depth/src/deep.ts->packages/feature-depth/src/leaf.ts',
      from: 'packages/feature-depth/src/deep.ts',
      to: 'packages/feature-depth/src/leaf.ts',
    },
  ],
};

const smokeHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CodeGraphy Webview Smoke</title>
    <link rel="stylesheet" href="/dist/webview/index.css" />
  </head>
  <body>
    <div id="root"></div>
    <script>
      (function bootstrapWebviewState() {
        const publish = function () {
          window.postMessage(
            { type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } },
            '*'
          );
          window.postMessage(
            {
              type: 'SETTINGS_UPDATED',
              payload: { bidirectionalEdges: 'separate', showOrphans: true },
            },
            '*'
          );
        };

        window.addEventListener('load', function () {
          setTimeout(publish, 50);
        }, { once: true });
      })();
    </script>
    <script type="module" src="/dist/webview/index.js"></script>
  </body>
</html>`;

const depthHarnessScript = `
  (() => {
    window.__CODEGRAPHY_ENABLE_GRAPH_DEBUG__ = true;
    const fullGraph = ${JSON.stringify(fullGraph)};
    window.__CODEGRAPHY_ENABLE_GRAPH_DEBUG__ = true;
    const state = {
      activeFilePath: 'packages/app/src/index.ts',
      depthMode: true,
      boundsNodes: [],
      depthLimit: 1,
    };

    const panel = () => document.querySelector('[data-testid="depth-harness-panel"]');
    const byTestId = (testId) => document.querySelector('[data-testid="' + testId + '"]');

    const postToWebview = (message) => {
      window.postMessage(message, '*');
    };

    const buildDepthGraph = () => {
      if (!state.depthMode || !state.activeFilePath) {
        return fullGraph;
      }

      const neighbors = new Map();
      for (const node of fullGraph.nodes) {
        neighbors.set(node.id, new Set());
      }

      for (const edge of fullGraph.edges) {
        neighbors.get(edge.from)?.add(edge.to);
        neighbors.get(edge.to)?.add(edge.from);
      }

      const visited = new Set([state.activeFilePath]);
      let frontier = new Set([state.activeFilePath]);

      for (let depth = 0; depth < state.depthLimit; depth += 1) {
        const nextFrontier = new Set();
        for (const nodeId of frontier) {
          for (const neighborId of neighbors.get(nodeId) ?? []) {
            if (visited.has(neighborId)) {
              continue;
            }
            visited.add(neighborId);
            nextFrontier.add(neighborId);
          }
        }
        frontier = nextFrontier;
      }

      return {
        nodes: fullGraph.nodes.filter((node) => visited.has(node.id)),
        edges: fullGraph.edges.filter(
          (edge) => visited.has(edge.from) && visited.has(edge.to),
        ),
      };
    };

    const currentGraph = () => buildDepthGraph();

    const renderHarnessState = () => {
      const graph = currentGraph();
      byTestId('depth-harness-view').textContent = state.depthMode ? 'depth:on' : 'depth:off';
      byTestId('depth-harness-depth').textContent = String(state.depthLimit);
      byTestId('depth-harness-node-count').textContent = String(graph.nodes.length);
      byTestId('depth-harness-node-ids').textContent = graph.nodes.map((node) => node.id).join('\\n');
      byTestId('depth-harness-bounds-count').textContent = String(state.boundsNodes.length);
      panel()?.setAttribute('data-ready', 'true');
    };

    let boundsProbeTimer = null;
    let boundsProbeAttempts = 0;
    let pendingSettledFit = false;

    const scheduleBoundsProbe = () => {
      if (boundsProbeTimer) {
        window.clearTimeout(boundsProbeTimer);
      }
      boundsProbeAttempts = 0;
      const probe = () => {
        boundsProbeAttempts += 1;
        postToWebview({ type: 'GET_NODE_BOUNDS' });
        if (boundsProbeAttempts < 5) {
          boundsProbeTimer = window.setTimeout(probe, 600);
        }
      };
      boundsProbeTimer = window.setTimeout(probe, 900);
    };

    const publishSettings = () => {
      postToWebview({
        type: 'SETTINGS_UPDATED',
        payload: { bidirectionalEdges: 'separate', showOrphans: false },
      });
    };

    const publishIndexStatus = () => {
      postToWebview({
        type: 'GRAPH_INDEX_STATUS_UPDATED',
        payload: { hasIndex: true },
      });
    };

    const publishDepthMode = () => {
      postToWebview({
        type: 'DEPTH_MODE_UPDATED',
        payload: { depthMode: state.depthMode },
      });
    };

    const publishDepthLimit = () => {
      postToWebview({
        type: 'DEPTH_LIMIT_UPDATED',
        payload: { depthLimit: state.depthLimit },
      });
    };

    const publishActiveFile = () => {
      postToWebview({
        type: 'ACTIVE_FILE_UPDATED',
        payload: { filePath: state.activeFilePath },
      });
    };

    const publishGraph = () => {
      state.boundsNodes = [];
      pendingSettledFit = true;
      postToWebview({
        type: 'GRAPH_DATA_UPDATED',
        payload: currentGraph(),
      });
      window.setTimeout(() => {
        postToWebview({ type: 'FIT_VIEW' });
      }, 300);
      renderHarnessState();
      scheduleBoundsProbe();
    };

    const publishAll = () => {
      publishIndexStatus();
      publishDepthMode();
      publishSettings();
      publishDepthLimit();
      publishActiveFile();
      publishGraph();
    };

    const handleWebviewMessage = (message) => {
      switch (message?.type) {
        case 'WEBVIEW_READY':
          publishAll();
          break;
        case 'UPDATE_DEPTH_MODE':
          state.depthMode = Boolean(message.payload?.depthMode);
          publishDepthMode();
          publishGraph();
          break;
        case 'CHANGE_DEPTH_LIMIT':
          state.depthLimit = message.payload.depthLimit;
          publishDepthLimit();
          publishGraph();
          break;
        case 'OPEN_FILE':
          state.activeFilePath = message.payload.path;
          publishActiveFile();
          publishGraph();
          break;
        case 'NODE_BOUNDS_RESPONSE':
          state.boundsNodes = Array.isArray(message.payload?.nodes) ? message.payload.nodes : [];
          renderHarnessState();
          if (state.boundsNodes.length >= currentGraph().nodes.length && boundsProbeTimer) {
            window.clearTimeout(boundsProbeTimer);
            boundsProbeTimer = null;
          }
          if (pendingSettledFit && state.boundsNodes.length >= currentGraph().nodes.length) {
            pendingSettledFit = false;
            window.setTimeout(() => {
              postToWebview({ type: 'FIT_VIEW' });
            }, 150);
          }
          break;
        default:
          break;
      }
    };

    window.acquireVsCodeApi = () => ({
      getState: () => null,
      postMessage: handleWebviewMessage,
      setState: () => {},
    });

    window.addEventListener('load', () => {
      renderHarnessState();
    }, { once: true });
  })();
`;

const depthHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CodeGraphy Depth Mode Harness</title>
    <link rel="stylesheet" href="/dist/webview/index.css" />
    <style>
      body {
        margin: 0;
        overflow: hidden;
      }

      [data-testid="depth-harness-panel"] {
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 40;
        width: min(28rem, calc(100vw - 24px));
        border: 1px solid rgba(63, 63, 70, 0.9);
        border-radius: 12px;
        background: rgba(24, 24, 27, 0.9);
        color: #f4f4f5;
        padding: 12px 14px;
        font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.28);
        backdrop-filter: blur(10px);
      }

      [data-testid="depth-harness-panel"] strong {
        display: inline-block;
        min-width: 110px;
        color: #a1a1aa;
      }

      [data-testid="depth-harness-node-ids"] {
        margin-top: 8px;
        max-height: 12rem;
        overflow: auto;
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <div data-testid="depth-harness-panel" data-ready="false">
      <div><strong>view</strong><span data-testid="depth-harness-view"></span></div>
      <div><strong>depth</strong><span data-testid="depth-harness-depth"></span></div>
      <div><strong>node-count</strong><span data-testid="depth-harness-node-count"></span></div>
      <div><strong>bounds-count</strong><span data-testid="depth-harness-bounds-count"></span></div>
      <div><strong>node-ids</strong></div>
      <div data-testid="depth-harness-node-ids"></div>
    </div>
    <script>${depthHarnessScript}</script>
    <script type="module" src="/dist/webview/index.js"></script>
  </body>
</html>`;

const server = http.createServer(async (req, res) => {
  try {
    const requestPath = req.url ?? '/';

    if (requestPath === '/' || requestPath === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(smokeHtml);
      return;
    }

    if (requestPath === '/depth-view') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(depthHtml);
      return;
    }

    if (!requestPath.startsWith('/dist/webview/')) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const relativePath = requestPath.replace('/dist/webview/', '');
    const filePath = path.join(webviewDist, relativePath);
    const ext = path.extname(filePath);
    const file = await readFile(filePath);

    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(file);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Playwright webview server listening on http://127.0.0.1:${port}\n`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
