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
    { id: 'src/index.ts', label: 'index.ts', color: '#38bdf8', x: 0, y: 0 },
    { id: 'src/utils.ts', label: 'utils.ts', color: '#38bdf8', x: 100, y: -60 },
    { id: 'src/types.ts', label: 'types.ts', color: '#22c55e', x: 100, y: 60 },
    { id: 'src/depth.ts', label: 'depth.ts', color: '#f59e0b', x: 220, y: -60 },
    { id: 'src/leaf.ts', label: 'leaf.ts', color: '#f59e0b', x: 340, y: -60 },
  ],
  edges: [
    {
      id: 'src/index.ts->src/utils.ts',
      from: 'src/index.ts',
      to: 'src/utils.ts',
    },
    {
      id: 'src/index.ts->src/types.ts',
      from: 'src/index.ts',
      to: 'src/types.ts',
    },
    {
      id: 'src/utils.ts->src/types.ts',
      from: 'src/utils.ts',
      to: 'src/types.ts',
    },
    {
      id: 'src/utils.ts->src/depth.ts',
      from: 'src/utils.ts',
      to: 'src/depth.ts',
    },
    {
      id: 'src/depth.ts->src/leaf.ts',
      from: 'src/depth.ts',
      to: 'src/leaf.ts',
    },
  ],
};

const organizeGraph = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#38bdf8', x: -120, y: 0, nodeType: 'file' },
    { id: 'src/button.ts', label: 'button.ts', color: '#38bdf8', x: 0, y: 80, nodeType: 'file' },
    { id: 'src/theme.ts', label: 'theme.ts', color: '#22c55e', x: 260, y: 0, nodeType: 'file' },
  ],
  edges: [
    {
      id: 'src/app.ts->src/button.ts#import',
      from: 'src/app.ts',
      to: 'src/button.ts',
      kind: 'import',
      sources: [{ id: 'test:import', pluginId: 'test', sourceId: 'import', label: 'Import' }],
    },
    {
      id: 'src/button.ts->src/theme.ts#import',
      from: 'src/button.ts',
      to: 'src/theme.ts',
      kind: 'import',
      sources: [{ id: 'test:import', pluginId: 'test', sourceId: 'import', label: 'Import' }],
    },
  ],
};

const organizeGraphLayout = {
  collapsedNodes: {},
  pinnedNodes: {
    'section:frontend': {
      nodeId: 'section:frontend',
      '2D': { x: -60, y: 40 },
    },
  },
  sections: {
    'section:frontend': {
      id: 'section:frontend',
      label: 'Frontend',
      color: '#f97316',
      x: -180,
      y: -80,
      width: 280,
      height: 220,
      collapsed: true,
      updatedAt: '2026-05-19T00:00:00.000Z',
    },
  },
  ownership: {
    'src/app.ts': {
      itemId: 'src/app.ts',
      itemKind: 'node',
      ownerSectionId: 'section:frontend',
      updatedAt: '2026-05-19T00:00:00.000Z',
    },
    'src/button.ts': {
      itemId: 'src/button.ts',
      itemKind: 'node',
      ownerSectionId: 'section:frontend',
      updatedAt: '2026-05-19T00:00:00.000Z',
    },
  },
};

const organizeContributionStatuses = [
  {
    kind: 'runtimeNodes',
    pluginId: 'codegraphy.organize',
    contributionId: 'codegraphy.organize.section-nodes',
    label: 'Graph Section Nodes',
  },
  {
    kind: 'runtimeEdges',
    pluginId: 'codegraphy.organize',
    contributionId: 'codegraphy.organize.section-membership-edges',
    label: 'Graph Section Membership Edges',
  },
  {
    kind: 'projections',
    pluginId: 'codegraphy.organize',
    contributionId: 'codegraphy.organize.graph-section-projection',
    label: 'Graph Section Projection',
  },
  {
    kind: 'forces',
    pluginId: 'codegraphy.organize',
    contributionId: 'codegraphy.organize.section-bounds-force',
    label: 'Graph Section Bounds Force',
  },
  {
    kind: 'ui',
    pluginId: 'codegraphy.organize',
    contributionId: 'codegraphy.organize.section-frames',
    label: 'Graph Section Frames',
  },
];

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
      activeFilePath: 'src/index.ts',
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

const organizeHarnessScript = `
  (() => {
    window.__CODEGRAPHY_ENABLE_GRAPH_DEBUG__ = true;

    const graph = ${JSON.stringify(organizeGraph)};
    const graphLayout = ${JSON.stringify(organizeGraphLayout)};
    const organizeContributionStatuses = ${JSON.stringify(organizeContributionStatuses)};
    const state = {
      organizeEnabled: true,
      boundsNodes: [],
    };

    const byTestId = (testId) => document.querySelector('[data-testid="' + testId + '"]');
    const postToWebview = (message) => {
      window.postMessage(message, '*');
    };

    const expectedVisibleNodeCount = () => state.organizeEnabled ? 2 : graph.nodes.length;

    const renderHarnessState = () => {
      byTestId('organize-harness-view').textContent = state.organizeEnabled ? 'organize:on' : 'organize:off';
      byTestId('organize-harness-bounds-count').textContent = String(state.boundsNodes.length);
      byTestId('organize-harness-section-status').textContent = state.organizeEnabled ? 'sections:available' : 'sections:unavailable';
      byTestId('organize-harness-pin-state').textContent = state.organizeEnabled ? 'Pin Node' : 'pin:hidden';
      byTestId('organize-harness-toggle').textContent = state.organizeEnabled ? 'Disable Organize' : 'Enable Organize';
      byTestId('organize-harness-panel')?.setAttribute('data-ready', 'true');
    };

    let boundsProbeTimer = null;
    let boundsProbeAttempts = 0;

    const scheduleBoundsProbe = () => {
      if (boundsProbeTimer) {
        window.clearTimeout(boundsProbeTimer);
      }
      boundsProbeAttempts = 0;
      const probe = () => {
        boundsProbeAttempts += 1;
        postToWebview({ type: 'GET_NODE_BOUNDS' });
        if (boundsProbeAttempts < 8) {
          boundsProbeTimer = window.setTimeout(probe, 500);
        }
      };
      boundsProbeTimer = window.setTimeout(probe, 500);
    };

    const publishIndexStatus = () => {
      postToWebview({
        type: 'GRAPH_INDEX_STATUS_UPDATED',
        payload: { hasIndex: true, freshness: 'fresh', detail: 'fresh' },
      });
    };

    const publishSettings = () => {
      postToWebview({
        type: 'SETTINGS_UPDATED',
        payload: { bidirectionalEdges: 'separate', showOrphans: true },
      });
    };

    const publishLayout = () => {
      postToWebview({
        type: 'GRAPH_LAYOUT_UPDATED',
        payload: graphLayout,
      });
    };

    const publishContributions = () => {
      postToWebview({
        type: 'GRAPH_VIEW_CONTRIBUTIONS_UPDATED',
        payload: {
          contributions: state.organizeEnabled ? organizeContributionStatuses : [],
        },
      });
    };

    const fitSoon = () => {
      window.setTimeout(() => postToWebview({ type: 'FIT_VIEW' }), 250);
      window.setTimeout(() => postToWebview({ type: 'FIT_VIEW' }), 700);
    };

    const publishGraph = () => {
      state.boundsNodes = [];
      postToWebview({
        type: 'GRAPH_DATA_UPDATED',
        payload: graph,
      });
      fitSoon();
      renderHarnessState();
      scheduleBoundsProbe();
    };

    const publishAll = () => {
      publishIndexStatus();
      publishSettings();
      publishLayout();
      publishContributions();
      publishGraph();
    };

    const setOrganizeEnabled = (enabled) => {
      if (state.organizeEnabled === enabled) {
        return;
      }
      state.organizeEnabled = enabled;
      publishContributions();
      publishGraph();
    };

    const handleWebviewMessage = (message) => {
      switch (message?.type) {
        case 'WEBVIEW_READY':
          publishAll();
          break;
        case 'NODE_BOUNDS_RESPONSE':
          state.boundsNodes = Array.isArray(message.payload?.nodes) ? message.payload.nodes : [];
          renderHarnessState();
          if (state.boundsNodes.length >= expectedVisibleNodeCount() && boundsProbeTimer) {
            window.clearTimeout(boundsProbeTimer);
            boundsProbeTimer = null;
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
      byTestId('organize-harness-toggle')?.addEventListener('click', () => {
        setOrganizeEnabled(!state.organizeEnabled);
      });
    }, { once: true });
  })();
`;

const organizeHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CodeGraphy Organize Toggle Harness</title>
    <link rel="stylesheet" href="/dist/webview/index.css" />
    <style>
      body {
        margin: 0;
        overflow: hidden;
      }

      [data-testid="organize-harness-panel"] {
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 40;
        width: min(24rem, calc(100vw - 24px));
        border: 1px solid rgba(63, 63, 70, 0.9);
        border-radius: 8px;
        background: rgba(24, 24, 27, 0.9);
        color: #f4f4f5;
        padding: 12px 14px;
        font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.28);
        backdrop-filter: blur(10px);
      }

      [data-testid="organize-harness-panel"] strong {
        display: inline-block;
        min-width: 110px;
        color: #a1a1aa;
      }

      [data-testid="organize-harness-toggle"] {
        margin-top: 10px;
        width: 100%;
        border: 1px solid rgba(244, 244, 245, 0.24);
        border-radius: 6px;
        background: rgba(39, 39, 42, 0.96);
        color: #f4f4f5;
        padding: 6px 8px;
        font: inherit;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <div data-testid="organize-harness-panel" data-ready="false">
      <div><strong>view</strong><span data-testid="organize-harness-view"></span></div>
      <div><strong>status</strong><span data-testid="organize-harness-section-status"></span></div>
      <div><strong>pin action</strong><span data-testid="organize-harness-pin-state"></span></div>
      <div><strong>bounds-count</strong><span data-testid="organize-harness-bounds-count"></span></div>
      <button type="button" data-testid="organize-harness-toggle"></button>
    </div>
    <script>${organizeHarnessScript}</script>
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

    if (requestPath === '/organize-toggle') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(organizeHtml);
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
