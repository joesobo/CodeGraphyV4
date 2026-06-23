import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

test('VS Code graph view runner parses graph stats labels', async () => {
  const moduleUrl = pathToFileURL(
    path.resolve('scripts/performance/measure-vscode-graph-view.mjs'),
  ).href;
  const { parseGraphStatsLabel } = await import(moduleUrl);

  assert.deepEqual(parseGraphStatsLabel('2,246 nodes • 3,130 connections'), {
    nodeCount: 2246,
    edgeCount: 3130,
  });
  assert.deepEqual(parseGraphStatsLabel('1 node • 1 connection'), {
    nodeCount: 1,
    edgeCount: 1,
  });
  assert.equal(parseGraphStatsLabel('Loading graph...'), null);
});

test('VS Code graph view runner summarizes in-webview toggle event deltas', async () => {
  const moduleUrl = pathToFileURL(
    path.resolve('scripts/performance/measure-vscode-graph-view.mjs'),
  ).href;
  const { summarizeSwitchTransitionSamples } = await import(moduleUrl);

  assert.deepEqual(summarizeSwitchTransitionSamples([
    {
      durationMs: 220,
      webviewEvents: [
        { name: 'graphScope.edgeVisibility.optimistic', at: 10 },
        { name: 'graphStats.rendered', at: 63.2 },
      ],
    },
    {
      durationMs: 190,
      webviewEvents: [
        { name: 'graphScope.edgeVisibility.optimistic', at: 20 },
        { name: 'graphStats.rendered', at: 75.6 },
      ],
    },
    {
      durationMs: 205,
      webviewEvents: [
        { name: 'graphScope.edgeVisibility.optimistic', at: 30 },
        { name: 'graphStats.rendered', at: 79.4 },
      ],
    },
  ]), {
    iterations: 3,
    minMs: 190,
    medianMs: 205,
    p95Ms: 220,
    maxMs: 220,
    webviewEventDelta: {
      iterations: 3,
      minMs: 49,
      medianMs: 53,
      p95Ms: 56,
      maxMs: 56,
    },
  });
});
