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
          window.postMessage({ type: 'APP_BOOTSTRAP_COMPLETE' }, '*');
          window.postMessage(
            {
              type: 'SETTINGS_UPDATED',
              payload: { bidirectionalEdges: 'separate', showOrphans: true },
            },
            '*'
          );
          window.postMessage({ type: 'APP_BOOTSTRAP_COMPLETE' }, '*');
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
        payload: { bidirectionalEdges: 'separate', showMinimap: true, showOrphans: false },
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

    const publishBootstrapComplete = () => {
      postToWebview({ type: 'APP_BOOTSTRAP_COMPLETE' });
    };

    const publishAll = () => {
      publishIndexStatus();
      publishDepthMode();
      publishSettings();
      publishDepthLimit();
      publishActiveFile();
      publishGraph();
      publishBootstrapComplete();
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

const packageGraphViewPluginGraph = {
  nodes: [
    { id: 'src/index.ts', label: 'index.ts', color: '#38bdf8', x: 0, y: 0 },
    { id: 'src/utils.ts', label: 'utils.ts', color: '#22c55e', x: 140, y: 0 },
  ],
  edges: [
    {
      id: 'src/index.ts->src/utils.ts',
      from: 'src/index.ts',
      to: 'src/utils.ts',
      kind: 'import',
      sources: [],
    },
  ],
};

const packageGraphViewPluginScript = `
  export function activate(api) {
    api.registerGraphViewContributions({
      contextMenu: [
        {
          id: 'e2e.graph-view-plugin.create-item',
          label: 'New Plugin Item...',
          placement: { menu: 'create' },
          targets: [{ kind: 'background' }],
          run(context) {
            api.sendMessage({
              type: 'createItem',
              data: {
                position: context.graphPosition ?? { x: 0, y: 0 },
                selectedNodeIds: context.selectedNodeIds,
              },
            });
          },
        },
        {
          id: 'e2e.graph-view-plugin.node-action',
          label: 'Plugin Node Action',
          targets: [{ kind: 'node' }],
          isVisible(context) {
            return context.selectedNodeIds.length === 1;
          },
          run(context) {
            api.sendMessage({
              type: 'nodeAction',
              data: {
                nodeId: context.selectedNodeIds[0],
                position: context.selectedNodePositions?.[context.selectedNodeIds[0]]
                  ?? context.graphPosition
                  ?? { x: 0, y: 0 },
              },
            });
          },
        },
      ],
    });
    api.sendMessage({ type: 'activated', data: { ok: true } });
  }
`;

const packageGraphViewPluginHarnessScript = `
  (() => {
    window.__CODEGRAPHY_ENABLE_GRAPH_DEBUG__ = true;
    const graph = ${JSON.stringify(packageGraphViewPluginGraph)};
    const packageName = '@codegraphy/e2e-graph-view-plugin';
    const pluginId = 'e2e.graph-view-plugin';
    const state = {
      enabled: true,
      messages: [],
    };

    const byTestId = (testId) => document.querySelector('[data-testid="' + testId + '"]');
    const postToWebview = (message) => window.postMessage(message, '*');

    const renderHarnessState = () => {
      byTestId('package-plugin-harness-enabled').textContent = state.enabled ? 'on' : 'off';
      byTestId('package-plugin-harness-messages').textContent = state.messages
        .map((message) => message.type)
        .join('\\n');
    };

    const publishBaseGraphState = () => {
      postToWebview({
        type: 'GRAPH_INDEX_STATUS_UPDATED',
        payload: {
          hasIndex: true,
          freshness: 'fresh',
          detail: 'CodeGraphy index is fresh.',
        },
      });
      postToWebview({
        type: 'SETTINGS_UPDATED',
        payload: { bidirectionalEdges: 'separate', showOrphans: true },
      });
      postToWebview({
        type: 'GRAPH_DATA_UPDATED',
        payload: graph,
      });
    };

    const publishPluginStatus = () => {
      postToWebview({
        type: 'PLUGINS_UPDATED',
        payload: {
          plugins: [
            state.enabled
              ? {
                id: pluginId,
                packageName,
                name: 'E2E Graph View Plugin',
                version: '1.0.0',
                supportedExtensions: [],
                status: 'installed',
                enabled: true,
                connectionCount: 0,
              }
              : {
                id: packageName,
                packageName,
                name: packageName,
                version: '1.0.0',
                supportedExtensions: [],
                status: 'installed',
                enabled: false,
                connectionCount: 0,
              },
          ],
        },
      });
    };

    const injectPlugin = () => {
      postToWebview({
        type: 'PLUGIN_WEBVIEW_INJECT',
        payload: {
          pluginId,
          scripts: ['/plugin/e2e-graph-view-plugin.js'],
          styles: [],
        },
      });
    };

    const publishPluginState = () => {
      publishPluginStatus();
      if (state.enabled) {
        injectPlugin();
      }
      renderHarnessState();
    };

    const publishBootstrapComplete = () => {
      postToWebview({ type: 'APP_BOOTSTRAP_COMPLETE' });
    };

    const publishAll = () => {
      publishBaseGraphState();
      publishPluginState();
      publishBootstrapComplete();
      window.setTimeout(() => postToWebview({ type: 'FIT_VIEW' }), 300);
    };

    const handleWebviewMessage = (message) => {
      switch (message?.type) {
        case 'WEBVIEW_READY':
          publishAll();
          break;
        case 'TOGGLE_PLUGIN':
          state.enabled = Boolean(message.payload?.enabled);
          publishPluginState();
          break;
        case 'GRAPH_INTERACTION':
          if (typeof message.payload?.event === 'string' && message.payload.event.startsWith('plugin:' + pluginId + ':')) {
            state.messages.push({
              type: message.payload.event.split(':').at(-1),
              data: message.payload.data,
            });
            renderHarnessState();
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

const packageGraphViewPluginHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CodeGraphy Package Graph View Plugin Harness</title>
    <link rel="stylesheet" href="/dist/webview/index.css" />
    <style>
      body {
        margin: 0;
        overflow: hidden;
      }

      [data-testid="package-plugin-harness-panel"] {
        position: fixed;
        right: 12px;
        bottom: 12px;
        z-index: 60;
        width: min(22rem, calc(100vw - 24px));
        border: 1px solid rgba(63, 63, 70, 0.9);
        border-radius: 8px;
        background: rgba(24, 24, 27, 0.9);
        color: #f4f4f5;
        padding: 10px 12px;
        pointer-events: none;
        font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }

      [data-testid="package-plugin-harness-panel"] strong {
        display: inline-block;
        min-width: 72px;
        color: #a1a1aa;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <div data-testid="package-plugin-harness-panel">
      <div><strong>enabled</strong><span data-testid="package-plugin-harness-enabled"></span></div>
      <div><strong>messages</strong></div>
      <div data-testid="package-plugin-harness-messages"></div>
    </div>
    <script>${packageGraphViewPluginHarnessScript}</script>
    <script type="module" src="/dist/webview/index.js"></script>
  </body>
</html>`;

const particlesPluginHarnessScript = `
  (() => {
    const pluginId = 'codegraphy.particles';
    const postToWebview = (message) => {
      window.postMessage(message, '*');
    };

    const publishBaseState = () => {
      postToWebview({
        type: 'SETTINGS_UPDATED',
        payload: { bidirectionalEdges: 'separate', showOrphans: true },
      });
      postToWebview({
        type: 'GRAPH_DATA_UPDATED',
        payload: ${JSON.stringify(fullGraph)},
      });
      postToWebview({
        type: 'PLUGINS_UPDATED',
        payload: {
          plugins: [{
            id: pluginId,
            packageName: '@codegraphy-dev/plugin-particles',
            name: 'Particles',
            version: '0.1.0',
            supportedExtensions: [],
            status: 'installed',
            enabled: true,
            connectionCount: 0,
          }],
        },
      });
    };

    const injectParticlesPlugin = () => {
      postToWebview({
        type: 'PLUGIN_WEBVIEW_INJECT',
        payload: {
          pluginId,
          scripts: ['/plugin-particles/webview.js'],
          styles: [],
          assets: [{
            id: 'fireflies',
            label: 'Fireflies',
            url: '/plugin-particles/fireflies.js',
            kind: 'particle-effect',
          }],
        },
      });
    };

    const selectCustomEffect = () => {
      postToWebview({
        type: 'PLUGIN_DATA_UPDATED',
        payload: {
          pluginId,
          data: {
            enabled: true,
            preset: 'custom',
            customEffectId: 'fireflies',
          },
        },
      });
    };

    const selectEmbersEffect = () => {
      postToWebview({
        type: 'PLUGIN_DATA_UPDATED',
        payload: {
          pluginId,
          data: {
            enabled: true,
            preset: 'embers',
            intensity: 1,
          },
        },
      });
    };

    const handleWebviewMessage = (message) => {
      if (message?.type === 'WEBVIEW_READY') {
        publishBaseState();
        if (window.location.pathname === '/particles-plugin-embers-on-load') {
          selectEmbersEffect();
          injectParticlesPlugin();
        } else {
          injectParticlesPlugin();
          window.setTimeout(selectCustomEffect, 100);
        }
        window.setTimeout(() => postToWebview({ type: 'APP_BOOTSTRAP_COMPLETE' }), 150);
        window.setTimeout(() => postToWebview({ type: 'FIT_VIEW' }), 300);
        return;
      }

      if (message?.type === 'UPDATE_PLUGIN_DATA' && message.payload?.pluginId === pluginId) {
        postToWebview({
          type: 'PLUGIN_DATA_UPDATED',
          payload: {
            pluginId,
            data: message.payload.data,
          },
        });
      }
    };

    window.acquireVsCodeApi = () => ({
      getState: () => null,
      postMessage: handleWebviewMessage,
      setState: () => {},
    });
  })();
`;

const particlesPluginHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CodeGraphy Particles Plugin Harness</title>
    <link rel="stylesheet" href="/dist/webview/index.css" />
    <style>
      body {
        margin: 0;
        overflow: hidden;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>${particlesPluginHarnessScript}</script>
    <script type="module" src="/dist/webview/index.js"></script>
  </body>
</html>`;

const repoFirefliesModule = `
  export function activateParticleEffect({ canvas, intensity = 1 }) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};
    let active = true;
    let animationFrame = 0;
    let time = 0;
    const createFirefly = (edgeSpawn = false) => {
      const width = canvas.width || 960;
      const height = canvas.height || 540;
      const depth = Math.random();
      const fromLeft = Math.random() > 0.5;
      const x = edgeSpawn
        ? (fromLeft ? -48 - Math.random() * 80 : width + 48 + Math.random() * 80)
        : Math.random() * width;
      const y = Math.random() * height;
      return {
        x,
        y,
        previousX: x,
        previousY: y,
        vx: (fromLeft ? 0.08 : -0.08) + (Math.random() - 0.5) * 0.34,
        vy: (Math.random() - 0.5) * 0.26,
        phase: Math.random() * Math.PI * 2,
        size: 0.9 + depth * 1.8 + Math.random() * 0.55,
        depth,
        life: Math.random() * 180,
        maxLife: 480 + Math.random() * 560,
        pulseSpeed: 0.018 + Math.random() * 0.045,
        wander: Math.random() * Math.PI * 2,
        hueShift: Math.random(),
        flash: Math.random() > 0.9 ? Math.random() : 0,
      };
    };
    const fireflies = Array.from({ length: 92 }, () => createFirefly(false));
    const drawFirefly = (fly) => {
      const lifeIn = Math.min(1, fly.life / 90);
      const lifeOut = Math.min(1, (fly.maxLife - fly.life) / 120);
      const lifeAlpha = Math.max(0, Math.min(lifeIn, lifeOut));
      const pulse = Math.max(0, Math.sin(fly.phase)) ** 2.4;
      const alpha = (0.12 + pulse * 0.32 + fly.flash * 0.4) * lifeAlpha * (0.55 + intensity * 0.72);
      const coreRadius = fly.size * (0.9 + pulse * 0.45 + fly.flash * 0.5);
      const glowRadius = coreRadius * (3.4 + fly.depth * 2.6);
      const amber = 145 + Math.round(fly.hueShift * 42);
      const orange = 84 + Math.round(fly.hueShift * 42);

      const trail = ctx.createLinearGradient(fly.previousX, fly.previousY, fly.x, fly.y);
      trail.addColorStop(0, 'rgba(255, 118, 50, 0)');
      trail.addColorStop(0.5, 'rgba(255, ' + amber + ', ' + orange + ', ' + (alpha * 0.08) + ')');
      trail.addColorStop(1, 'rgba(255, ' + amber + ', ' + orange + ', ' + (alpha * 0.2) + ')');
      ctx.strokeStyle = trail;
      ctx.lineWidth = Math.max(0.65, coreRadius * 0.72);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(fly.previousX, fly.previousY);
      ctx.lineTo(fly.x, fly.y);
      ctx.stroke();

      const aura = ctx.createRadialGradient(fly.x, fly.y, 0, fly.x, fly.y, glowRadius);
      aura.addColorStop(0, 'rgba(255, 236, 182, ' + Math.min(0.82, alpha * 1.16) + ')');
      aura.addColorStop(0.2, 'rgba(255, ' + amber + ', ' + orange + ', ' + (alpha * 0.36) + ')');
      aura.addColorStop(0.58, 'rgba(198, 76, 25, ' + (alpha * 0.11) + ')');
      aura.addColorStop(1, 'rgba(198, 76, 25, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(fly.x, fly.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 220, 146, ' + Math.min(0.8, alpha * 0.7) + ')';
      ctx.beginPath();
      ctx.ellipse(
        fly.x - coreRadius * 0.36,
        fly.y + coreRadius * 0.18,
        coreRadius * 1.15,
        coreRadius * 0.48,
        fly.phase * 0.25,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 161, 76, ' + Math.min(0.68, alpha * 0.52) + ')';
      ctx.beginPath();
      ctx.ellipse(
        fly.x + coreRadius * 0.3,
        fly.y - coreRadius * 0.08,
        coreRadius * 0.86,
        coreRadius * 0.38,
        -fly.phase * 0.18,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 245, 191, ' + Math.min(1, alpha * 1.65) + ')';
      ctx.beginPath();
      ctx.arc(fly.x, fly.y, Math.max(0.7, coreRadius * 0.42), 0, Math.PI * 2);
      ctx.fill();
    };
    function draw() {
      if (!active) return;
      const width = canvas.width || 320;
      const height = canvas.height || 180;
      time += 0.016;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';
      for (const fly of fireflies) {
        fly.previousX = fly.x;
        fly.previousY = fly.y;
        fly.phase += fly.pulseSpeed * (0.8 + intensity * 0.9);
        fly.wander += 0.012 + fly.depth * 0.01;
        fly.life += 1;
        const field = Math.sin((fly.x + time * 70) * 0.004 + fly.wander)
          + Math.cos((fly.y - time * 40) * 0.005 + fly.phase * 0.45);
        fly.vx += Math.cos(fly.wander + field) * 0.009 * fly.depth;
        fly.vy += Math.sin(fly.wander * 0.8 - field) * 0.008 * fly.depth;
        fly.vx *= 0.988;
        fly.vy *= 0.988;
        fly.x += fly.vx * (0.62 + fly.depth * 0.52);
        fly.y += fly.vy * (0.62 + fly.depth * 0.52);
        if (Math.random() < 0.0025 * intensity) {
          fly.flash = 1;
        }
        fly.flash *= 0.9;
        if (fly.life > fly.maxLife || fly.x < -70 || fly.x > width + 70 || fly.y < -70 || fly.y > height + 70) {
          Object.assign(fly, createFirefly(true));
          continue;
        }
        drawFirefly(fly);
      }
      ctx.globalCompositeOperation = 'source-over';
      animationFrame = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      active = false;
      cancelAnimationFrame(animationFrame);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }
`;

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

    if (requestPath === '/package-graph-view-plugin') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(packageGraphViewPluginHtml);
      return;
    }

    if (requestPath === '/particles-plugin' || requestPath === '/particles-plugin-embers-on-load') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(particlesPluginHtml);
      return;
    }

    if (requestPath === '/plugin/e2e-graph-view-plugin.js') {
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(packageGraphViewPluginScript);
      return;
    }

    if (requestPath === '/plugin-particles/fireflies.js') {
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(repoFirefliesModule);
      return;
    }

    if (requestPath === '/plugin-particles/webview.js') {
      const file = await readFile(path.join(root, 'packages', 'plugin-particles', 'dist', 'webview.js'));
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(file);
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
