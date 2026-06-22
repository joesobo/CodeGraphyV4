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
