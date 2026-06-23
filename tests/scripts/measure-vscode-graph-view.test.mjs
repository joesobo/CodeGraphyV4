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

test('VS Code graph view runner summarizes startup webview stage durations', async () => {
  const moduleUrl = pathToFileURL(
    path.resolve('scripts/performance/measure-vscode-graph-view.mjs'),
  ).href;
  const { summarizeWebviewEventDurations } = await import(moduleUrl);

  assert.deepEqual(summarizeWebviewEventDurations([
    { name: 'visibleGraph.derive', durationMs: 110.2 },
    { name: 'graphStats.rendered', at: 215 },
    { name: 'visibleGraph.derive', durationMs: 90.8 },
    { name: 'graphRuntime.buildGraphData', durationMs: 8.4 },
  ]), {
    'graphRuntime.buildGraphData': {
      iterations: 1,
      minMs: 8,
      medianMs: 8,
      p95Ms: 8,
      maxMs: 8,
    },
    'visibleGraph.derive': {
      iterations: 2,
      minMs: 91,
      medianMs: 101,
      p95Ms: 110,
      maxMs: 110,
    },
  });
});

test('VS Code graph view runner parses extension host performance JSONL', async () => {
  const moduleUrl = pathToFileURL(
    path.resolve('scripts/performance/measure-vscode-graph-view.mjs'),
  ).href;
  const { parseExtensionHostPerformanceLog } = await import(moduleUrl);

  assert.deepEqual(parseExtensionHostPerformanceLog([
    '{"name":"graphWebview.resolve.start","at":1782129600100,"detail":{"visible":true}}',
    'not json',
    '{"name":"graphWebview.html.assigned","at":1782129600125,"detail":{"htmlLength":21}}',
    '{"name":12,"at":1782129600200}',
  ].join('\n')), [
    {
      name: 'graphWebview.resolve.start',
      at: 1782129600100,
      offsetMs: 0,
      detail: { visible: true },
    },
    {
      name: 'graphWebview.html.assigned',
      at: 1782129600125,
      offsetMs: 25,
      detail: { htmlLength: 21 },
    },
  ]);
});

test('VS Code graph view runner records frame lifecycle offsets from graph open', async () => {
  const moduleUrl = pathToFileURL(
    path.resolve('scripts/performance/measure-vscode-graph-view.mjs'),
  ).href;
  const { createGraphFrameLifecycleRecorder } = await import(moduleUrl);
  const recorder = createGraphFrameLifecycleRecorder(1_000);

  recorder.record('graphOpen.start', 1_000);
  recorder.recordFrame('frame.attached', { url: () => 'about:blank' }, 1_025);
  recorder.recordFrame('frame.navigated', { url: () => 'vscode-webview://test/fake.html' }, 1_150);
  recorder.record('graphFrame.ready', 1_425, { frameCount: 3 });

  assert.deepEqual(recorder.events, [
    {
      name: 'graphOpen.start',
      offsetMs: 0,
    },
    {
      name: 'frame.attached',
      offsetMs: 25,
      url: 'about:blank',
      webviewFrame: false,
    },
    {
      name: 'frame.navigated',
      offsetMs: 150,
      url: 'vscode-webview://test/fake.html',
      webviewFrame: true,
    },
    {
      name: 'graphFrame.ready',
      offsetMs: 425,
      frameCount: 3,
    },
  ]);
});

test('VS Code graph view runner builds a startup-ready measurement payload before interactions', async () => {
  const moduleUrl = pathToFileURL(
    path.resolve('scripts/performance/measure-vscode-graph-view.mjs'),
  ).href;
  const { createStartupMeasurements } = await import(moduleUrl);

  assert.deepEqual(createStartupMeasurements({
    extensionHostEvents: [{ name: 'command.open.start', offsetMs: 0 }],
    extensionHostLogPath: '/tmp/extension-host.jsonl',
    firstGraphReadyMs: 1200,
    firstGraphReadyPhases: {
      openGraphCommandMs: 100,
      graphFrameReadyMs: 1000,
      graphStatsReadyMs: 20,
    },
    firstGraphReadyWebviewEvents: [
      { name: 'visibleGraph.derive', durationMs: 12.2 },
      { name: 'graphStats.rendered', at: 30 },
    ],
    frameLifecycleEvents: [{ name: 'graphFrame.ready', offsetMs: 1100 }],
    initialStats: { nodeCount: 10, edgeCount: 5 },
    vscodeLaunchMs: 900,
  }), {
    status: 'startup-ready',
    vscodeLaunchMs: 900,
    firstGraphReadyMs: 1200,
    firstGraphReadyPhases: {
      openGraphCommandMs: 100,
      graphFrameReadyMs: 1000,
      graphStatsReadyMs: 20,
    },
    firstGraphReadyWebviewStages: {
      'visibleGraph.derive': {
        iterations: 1,
        minMs: 12,
        medianMs: 12,
        p95Ms: 12,
        maxMs: 12,
      },
    },
    firstGraphReadyWebviewEvents: [
      { name: 'visibleGraph.derive', durationMs: 12.2 },
      { name: 'graphStats.rendered', at: 30 },
    ],
    firstGraphReadyFrameLifecycleEvents: [{ name: 'graphFrame.ready', offsetMs: 1100 }],
    firstGraphReadyExtensionHostLogPath: '/tmp/extension-host.jsonl',
    extensionHostEvents: [{ name: 'command.open.start', offsetMs: 0 }],
    initialStats: { nodeCount: 10, edgeCount: 5 },
  });
});
