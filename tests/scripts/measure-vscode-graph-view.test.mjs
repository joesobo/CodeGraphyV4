import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
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

test('VS Code graph view runner ignores rendered events before the toggle start', async () => {
  const moduleUrl = pathToFileURL(
    path.resolve('scripts/performance/measure-vscode-graph-view.mjs'),
  ).href;
  const { getWebviewEventDeltaMs } = await import(moduleUrl);

  assert.equal(getWebviewEventDeltaMs({
    webviewEvents: [
      { name: 'graphStats.rendered', at: 5 },
      { name: 'graphScope.edgeVisibility.optimistic', at: 10 },
      { name: 'graphStats.rendered', at: 62.4 },
    ],
  }), 52.4);
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

test('VS Code graph view runner summarizes live-update request durations', async () => {
  const moduleUrl = pathToFileURL(
    path.resolve('scripts/performance/measure-vscode-graph-view.mjs'),
  ).href;
  const { summarizeLiveUpdateSamples } = await import(moduleUrl);

  assert.deepEqual(summarizeLiveUpdateSamples([
    {
      durationMs: 640,
      requestDurationMs: 120,
      requestStartDelayMs: 420,
      requestCompletionDelayMs: 540,
      saveEventToRequestStartDelayMs: 70,
      saveEventToRequestCompletionDelayMs: 190,
      workspaceRefreshStartToRequestStartDelayMs: 38,
      providerToRequestStartDelayMs: 36,
    },
    {
      durationMs: 590,
      requestDurationMs: 90,
      requestStartDelayMs: 390,
      requestCompletionDelayMs: 480,
      saveEventToRequestStartDelayMs: 40,
      saveEventToRequestCompletionDelayMs: 130,
      workspaceRefreshStartToRequestStartDelayMs: 8,
      providerToRequestStartDelayMs: 6,
    },
    {
      durationMs: 615,
      requestDurationMs: 105,
      requestStartDelayMs: 405,
      requestCompletionDelayMs: 510,
      saveEventToRequestStartDelayMs: 55,
      saveEventToRequestCompletionDelayMs: 160,
      workspaceRefreshStartToRequestStartDelayMs: 23,
      providerToRequestStartDelayMs: 21,
    },
  ]), {
    iterations: 3,
    minMs: 590,
    medianMs: 615,
    p95Ms: 640,
    maxMs: 640,
    requestDuration: {
      iterations: 3,
      minMs: 90,
      medianMs: 105,
      p95Ms: 120,
      maxMs: 120,
    },
    requestStartDelay: {
      iterations: 3,
      minMs: 390,
      medianMs: 405,
      p95Ms: 420,
      maxMs: 420,
    },
    requestCompletionDelay: {
      iterations: 3,
      minMs: 480,
      medianMs: 510,
      p95Ms: 540,
      maxMs: 540,
    },
    saveEventToRequestStartDelay: {
      iterations: 3,
      minMs: 40,
      medianMs: 55,
      p95Ms: 70,
      maxMs: 70,
    },
    saveEventToRequestCompletionDelay: {
      iterations: 3,
      minMs: 130,
      medianMs: 160,
      p95Ms: 190,
      maxMs: 190,
    },
    workspaceRefreshStartToRequestStartDelay: {
      iterations: 3,
      minMs: 8,
      medianMs: 23,
      p95Ms: 38,
      maxMs: 38,
    },
    providerToRequestStartDelay: {
      iterations: 3,
      minMs: 6,
      medianMs: 21,
      p95Ms: 36,
      maxMs: 36,
    },
  });
});

test('VS Code graph view runner computes live-update phase delays from extension-host events', async () => {
  const moduleUrl = pathToFileURL(
    path.resolve('scripts/performance/measure-vscode-graph-view.mjs'),
  ).href;
  const { computeLiveUpdatePhaseDelays } = await import(moduleUrl);

  const requestEvent = {
    name: 'graphAnalysis.request.completed',
    at: 1_300,
    detail: { requestId: 3, mode: 'incremental', durationMs: 80 },
  };

  assert.deepEqual(computeLiveUpdatePhaseDelays([
    { name: 'workspaceFiles.savedDocument.received', at: 1_100 },
    { name: 'workspaceRefresh.started', at: 1_132 },
    { name: 'graphView.refreshChangedFiles.received', at: 1_135 },
    { name: 'graphAnalysis.request.start', at: 1_220 },
    requestEvent,
  ], {
    requestEvent,
    startedAt: 1_000,
  }), {
    providerToRequestStartDelayMs: 85,
    saveEventToRequestCompletionDelayMs: 200,
    saveEventToRequestStartDelayMs: 120,
    workspaceRefreshStartToRequestStartDelayMs: 88,
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

test('VS Code graph view runner ignores request completions whose start was before the marker', async () => {
  const moduleUrl = pathToFileURL(
    path.resolve('scripts/performance/measure-vscode-graph-view.mjs'),
  ).href;
  const { findCompletedExtensionHostRequestAfter } = await import(moduleUrl);

  assert.deepEqual(findCompletedExtensionHostRequestAfter([
    {
      name: 'graphAnalysis.request.start',
      at: 90,
      detail: { requestId: 1, mode: 'incremental' },
    },
    {
      name: 'graphAnalysis.request.completed',
      at: 140,
      detail: { requestId: 1, mode: 'incremental', durationMs: 50 },
    },
    {
      name: 'graphAnalysis.request.start',
      at: 150,
      detail: { requestId: 2, mode: 'incremental' },
    },
    {
      name: 'graphAnalysis.request.completed',
      at: 190,
      detail: { requestId: 2, mode: 'incremental', durationMs: 40 },
    },
  ], {
    mode: 'incremental',
    startedAt: 100,
  }), {
    name: 'graphAnalysis.request.completed',
    at: 190,
    detail: { requestId: 2, mode: 'incremental', durationMs: 40 },
  });
});

test('VS Code graph view runner detects active extension-host requests', async () => {
  const moduleUrl = pathToFileURL(
    path.resolve('scripts/performance/measure-vscode-graph-view.mjs'),
  ).href;
  const { findActiveExtensionHostRequestIds } = await import(moduleUrl);

  assert.deepEqual(findActiveExtensionHostRequestIds([
    {
      name: 'graphAnalysis.request.start',
      at: 100,
      detail: { requestId: 1, mode: 'incremental' },
    },
    {
      name: 'graphAnalysis.request.start',
      at: 120,
      detail: { requestId: 2, mode: 'incremental' },
    },
    {
      name: 'graphAnalysis.request.completed',
      at: 150,
      detail: { requestId: 1, mode: 'incremental', durationMs: 50 },
    },
    {
      name: 'graphAnalysis.request.start',
      at: 180,
      detail: { requestId: 3, mode: 'analyze' },
    },
  ], 'incremental'), [2]);
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

test('VS Code graph view runner carries post-interaction extension-host events into completed metrics', async () => {
  const moduleUrl = pathToFileURL(
    path.resolve('scripts/performance/measure-vscode-graph-view.mjs'),
  ).href;
  const { createCompleteMeasurements } = await import(moduleUrl);

  const startupMeasurements = {
    status: 'startup-ready',
    extensionHostEvents: [{ name: 'graphAnalysis.request.completed', offsetMs: 10 }],
  };
  const extensionHostEvents = [
    { name: 'graphAnalysis.request.completed', offsetMs: 10 },
    { name: 'graphAnalysis.publish.broadcasts', offsetMs: 210 },
  ];

  assert.deepEqual(createCompleteMeasurements({
    extensionHostEvents,
    importsToggleSamples: [{ durationMs: 25 }],
    liveUpdateSamples: [{
      durationMs: 40,
      requestDurationMs: 30,
      requestStartDelayMs: 10,
      requestCompletionDelayMs: 40,
    }],
    startupMeasurements,
  }), {
    status: 'complete',
    extensionHostEvents,
    importsToggle: {
      iterations: 1,
      minMs: 25,
      medianMs: 25,
      p95Ms: 25,
      maxMs: 25,
      samples: [{ durationMs: 25 }],
    },
    liveUpdate: {
      iterations: 1,
      minMs: 40,
      medianMs: 40,
      p95Ms: 40,
      maxMs: 40,
      requestDuration: {
        iterations: 1,
        minMs: 30,
        medianMs: 30,
        p95Ms: 30,
        maxMs: 30,
      },
      requestStartDelay: {
        iterations: 1,
        minMs: 10,
        medianMs: 10,
        p95Ms: 10,
        maxMs: 10,
      },
      requestCompletionDelay: {
        iterations: 1,
        minMs: 40,
        medianMs: 40,
        p95Ms: 40,
        maxMs: 40,
      },
      samples: [{
        durationMs: 40,
        requestDurationMs: 30,
        requestStartDelayMs: 10,
        requestCompletionDelayMs: 40,
      }],
    },
  });
});

test('VS Code graph view runner waits for the live-update restore request before finishing', async (t) => {
  const moduleUrl = pathToFileURL(
    path.resolve('scripts/performance/measure-vscode-graph-view.mjs'),
  ).href;
  const { measureLiveUpdateTransition } = await import(moduleUrl);
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'codegraphy-live-update-'));
  t.after(() => rm(workspaceRoot, { recursive: true, force: true }));

  const liveUpdateFilePath = 'src/example.ts';
  const absoluteFilePath = path.join(workspaceRoot, liveUpdateFilePath);
  const extensionHostLogPath = path.join(workspaceRoot, 'extension-host.jsonl');
  const originalContent = 'export const value = 1;\n';
  await mkdir(path.dirname(absoluteFilePath), { recursive: true });
  await writeFile(absoluteFilePath, originalContent);
  await writeFile(extensionHostLogPath, '');

  let stopped = false;
  let markerRequestRecorded = false;
  let restoreRequestCompleted = false;
  const frame = {
    evaluate: async (callback) => {
      if (String(callback).includes('__codegraphyPerformance?.events')) {
        return [];
      }
      return undefined;
    },
    waitForTimeout: async ms => new Promise(resolve => setTimeout(resolve, ms)),
  };

  async function appendIncrementalRequest(requestId) {
    const startedAt = Date.now();
    await writeFile(extensionHostLogPath, [
      JSON.stringify({
        name: 'graphAnalysis.request.start',
        at: startedAt,
        detail: { requestId, mode: 'incremental' },
      }),
      JSON.stringify({
        name: 'graphAnalysis.request.completed',
        at: startedAt + 5,
        detail: { requestId, mode: 'incremental', durationMs: 5 },
      }),
      '',
    ].join('\n'), { flag: 'a' });
  }

  const observer = (async () => {
    while (!stopped) {
      const content = await readFile(absoluteFilePath, 'utf8');
      if (!markerRequestRecorded && content.includes('CodeGraphy live update perf marker')) {
        markerRequestRecorded = true;
        await appendIncrementalRequest(1);
      } else if (
        markerRequestRecorded
        && !restoreRequestCompleted
        && content === originalContent
      ) {
        await new Promise(resolve => setTimeout(resolve, 50));
        await appendIncrementalRequest(2);
        restoreRequestCompleted = true;
      }

      await new Promise(resolve => setTimeout(resolve, 5));
    }
  })();

  try {
    const sample = await measureLiveUpdateTransition({
      extensionHostLogPath,
      frame,
      liveUpdateFilePath,
      workspaceRoot,
    });

    assert.equal(sample.filePath, liveUpdateFilePath);
    assert.equal(restoreRequestCompleted, true);
    assert.equal(await readFile(absoluteFilePath, 'utf8'), originalContent);
  } finally {
    stopped = true;
    await observer;
  }
});

test('VS Code graph view runner waits for the live-update graph message in the webview', async (t) => {
  const moduleUrl = pathToFileURL(
    path.resolve('scripts/performance/measure-vscode-graph-view.mjs'),
  ).href;
  const { measureLiveUpdateTransition } = await import(moduleUrl);
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'codegraphy-live-update-webview-'));
  t.after(() => rm(workspaceRoot, { recursive: true, force: true }));

  const liveUpdateFilePath = 'src/example.ts';
  const absoluteFilePath = path.join(workspaceRoot, liveUpdateFilePath);
  const extensionHostLogPath = path.join(workspaceRoot, 'extension-host.jsonl');
  const originalContent = 'export const value = 1;\n';
  await mkdir(path.dirname(absoluteFilePath), { recursive: true });
  await writeFile(absoluteFilePath, originalContent);
  await writeFile(extensionHostLogPath, '');

  let stopped = false;
  let markerRequestRecorded = false;
  let restoreRequestCompleted = false;
  let markerWebviewMessageReceived = false;
  const webviewEvents = [];
  const frame = {
    evaluate: async (callback, argument) => {
      const source = String(callback);
      if (source.includes('window.__codegraphyPerformance =')) {
        webviewEvents.length = 0;
        return undefined;
      }
      if (source.includes('.filter(event')) {
        return webviewEvents.filter(event =>
          event.name === 'extensionMessage.received'
          && event.detail?.type === argument).length;
      }
      if (source.includes('__codegraphyPerformance?.events')) {
        return webviewEvents;
      }
      return undefined;
    },
    waitForTimeout: async ms => new Promise(resolve => setTimeout(resolve, ms)),
  };

  async function appendIncrementalRequest(requestId) {
    const startedAt = Date.now();
    await writeFile(extensionHostLogPath, [
      JSON.stringify({
        name: 'graphAnalysis.request.start',
        at: startedAt,
        detail: { requestId, mode: 'incremental' },
      }),
      JSON.stringify({
        name: 'graphWebview.message.send',
        at: startedAt + 1,
        detail: { type: 'GRAPH_NODE_METRICS_UPDATED' },
      }),
      JSON.stringify({
        name: 'graphAnalysis.request.completed',
        at: startedAt + 2,
        detail: { requestId, mode: 'incremental', durationMs: 2 },
      }),
      '',
    ].join('\n'), { flag: 'a' });
  }

  function enqueueGraphMessageReceived() {
    setTimeout(() => {
      markerWebviewMessageReceived = true;
      webviewEvents.push({
        name: 'extensionMessage.received',
        at: performance.now(),
        detail: { type: 'GRAPH_NODE_METRICS_UPDATED' },
      });
    }, 40);
  }

  const observer = (async () => {
    while (!stopped) {
      const content = await readFile(absoluteFilePath, 'utf8');
      if (!markerRequestRecorded && content.includes('CodeGraphy live update perf marker')) {
        markerRequestRecorded = true;
        await appendIncrementalRequest(1);
        enqueueGraphMessageReceived();
      } else if (
        markerRequestRecorded
        && !restoreRequestCompleted
        && content === originalContent
      ) {
        await appendIncrementalRequest(2);
        enqueueGraphMessageReceived();
        restoreRequestCompleted = true;
      }

      await new Promise(resolve => setTimeout(resolve, 5));
    }
  })();

  try {
    const sample = await measureLiveUpdateTransition({
      extensionHostLogPath,
      frame,
      liveUpdateFilePath,
      workspaceRoot,
    });

    assert.equal(sample.filePath, liveUpdateFilePath);
    assert.equal(markerWebviewMessageReceived, true);
    assert.equal(
      sample.webviewEvents.some(event => event.detail?.type === 'GRAPH_NODE_METRICS_UPDATED'),
      true,
    );
    assert.equal(restoreRequestCompleted, true);
  } finally {
    stopped = true;
    await observer;
  }
});

test('VS Code graph view runner can trigger live updates through editor save', async (t) => {
  const moduleUrl = pathToFileURL(
    path.resolve('scripts/performance/measure-vscode-graph-view.mjs'),
  ).href;
  const { measureLiveUpdateTransition } = await import(moduleUrl);
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'codegraphy-live-update-editor-'));
  t.after(() => rm(workspaceRoot, { recursive: true, force: true }));

  const liveUpdateFilePath = 'src/example.ts';
  const absoluteFilePath = path.join(workspaceRoot, liveUpdateFilePath);
  const extensionHostLogPath = path.join(workspaceRoot, 'extension-host.jsonl');
  const originalContent = 'export const value = 1;\n';
  await mkdir(path.dirname(absoluteFilePath), { recursive: true });
  await writeFile(absoluteFilePath, originalContent);
  await writeFile(extensionHostLogPath, '');

  let stopped = false;
  let editorSaveTriggered = false;
  let markerRequestRecorded = false;
  let restoreRequestCompleted = false;
  const frame = {
    evaluate: async (callback) => {
      if (String(callback).includes('__codegraphyPerformance?.events')) {
        return [];
      }
      return undefined;
    },
    waitForTimeout: async ms => new Promise(resolve => setTimeout(resolve, ms)),
  };

  async function saveFileThroughEditor({ absoluteFilePath: targetPath, marker, originalContent: content }) {
    editorSaveTriggered = true;
    await writeFile(targetPath, `${content}${marker}`);
  }

  async function appendIncrementalRequest(requestId) {
    const startedAt = Date.now();
    await writeFile(extensionHostLogPath, [
      JSON.stringify({
        name: 'graphAnalysis.request.start',
        at: startedAt,
        detail: { requestId, mode: 'incremental' },
      }),
      JSON.stringify({
        name: 'graphAnalysis.request.completed',
        at: startedAt + 3,
        detail: { requestId, mode: 'incremental', durationMs: 3 },
      }),
      '',
    ].join('\n'), { flag: 'a' });
  }

  const observer = (async () => {
    while (!stopped) {
      const content = await readFile(absoluteFilePath, 'utf8');
      if (!markerRequestRecorded && content.includes('CodeGraphy live update perf marker')) {
        markerRequestRecorded = true;
        await appendIncrementalRequest(1);
      } else if (
        markerRequestRecorded
        && !restoreRequestCompleted
        && content === originalContent
      ) {
        await appendIncrementalRequest(2);
        restoreRequestCompleted = true;
      }

      await new Promise(resolve => setTimeout(resolve, 5));
    }
  })();

  try {
    const sample = await measureLiveUpdateTransition({
      extensionHostLogPath,
      frame,
      liveUpdateFilePath,
      liveUpdateTrigger: 'editor-save',
      saveFileThroughEditor,
      workspaceRoot,
    });

    assert.equal(sample.filePath, liveUpdateFilePath);
    assert.equal(sample.trigger, 'editor-save');
    assert.equal(editorSaveTriggered, true);
    assert.equal(restoreRequestCompleted, true);
  } finally {
    stopped = true;
    await observer;
  }
});

test('VS Code graph view runner asks the webview to trigger editor-save live updates', async () => {
  const moduleUrl = pathToFileURL(
    path.resolve('scripts/performance/measure-vscode-graph-view.mjs'),
  ).href;
  const { saveLiveUpdateFileThroughEditor } = await import(moduleUrl);
  const messages = [];
  const frame = {
    evaluate: async (callback, filePath) => {
      const previousWindow = globalThis.window;
      globalThis.window = {
        vscode: {
          postMessage: message => messages.push(message),
        },
      };
      try {
        return callback(filePath);
      } finally {
        globalThis.window = previousWindow;
      }
    },
  };

  await saveLiveUpdateFileThroughEditor({
    absoluteFilePath: '/workspace/src/app.ts',
    frame,
  });

  assert.deepEqual(messages, [{
    type: 'PERF_SAVE_LIVE_UPDATE_FILE',
    payload: { path: '/workspace/src/app.ts' },
  }]);
});

test('VS Code graph view runner waits for active analyze requests before live-update markers', async (t) => {
  const moduleUrl = pathToFileURL(
    path.resolve('scripts/performance/measure-vscode-graph-view.mjs'),
  ).href;
  const { measureLiveUpdateTransition } = await import(moduleUrl);
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'codegraphy-live-update-analyze-'));
  t.after(() => rm(workspaceRoot, { recursive: true, force: true }));

  const liveUpdateFilePath = 'src/example.ts';
  const absoluteFilePath = path.join(workspaceRoot, liveUpdateFilePath);
  const extensionHostLogPath = path.join(workspaceRoot, 'extension-host.jsonl');
  const originalContent = 'export const value = 1;\n';
  await mkdir(path.dirname(absoluteFilePath), { recursive: true });
  await writeFile(absoluteFilePath, originalContent);
  await writeFile(extensionHostLogPath, `${JSON.stringify({
    name: 'graphAnalysis.request.start',
    at: Date.now() - 10,
    detail: { requestId: 7, mode: 'analyze' },
  })}\n`);

  let stopped = false;
  let markerSeenAt = 0;
  let analyzeCompletedAt = 0;
  let markerRequestRecorded = false;
  let restoreRequestCompleted = false;
  const frame = {
    evaluate: async (callback) => {
      if (String(callback).includes('__codegraphyPerformance?.events')) {
        return [];
      }
      return undefined;
    },
    waitForTimeout: async ms => new Promise(resolve => setTimeout(resolve, ms)),
  };

  async function appendRequestEvent(name, requestId, mode) {
    const at = Date.now();
    await writeFile(extensionHostLogPath, `${JSON.stringify({
      name,
      at,
      detail: { requestId, mode, durationMs: 5 },
    })}\n`, { flag: 'a' });
    return at;
  }

  async function appendIncrementalRequest(requestId) {
    await appendRequestEvent('graphAnalysis.request.start', requestId, 'incremental');
    await appendRequestEvent('graphAnalysis.request.completed', requestId, 'incremental');
  }

  const analyzeCompletion = new Promise((resolve, reject) => {
    setTimeout(() => {
      appendRequestEvent('graphAnalysis.request.completed', 7, 'analyze')
        .then((at) => {
          analyzeCompletedAt = at;
          resolve();
        })
        .catch(reject);
    }, 80);
  });

  const observer = (async () => {
    while (!stopped) {
      const content = await readFile(absoluteFilePath, 'utf8');
      if (!markerRequestRecorded && content.includes('CodeGraphy live update perf marker')) {
        markerSeenAt = Date.now();
        markerRequestRecorded = true;
        await appendIncrementalRequest(8);
      } else if (
        markerRequestRecorded
        && !restoreRequestCompleted
        && content === originalContent
      ) {
        await appendIncrementalRequest(9);
        restoreRequestCompleted = true;
      }

      await new Promise(resolve => setTimeout(resolve, 5));
    }
  })();

  try {
    await measureLiveUpdateTransition({
      extensionHostLogPath,
      frame,
      liveUpdateFilePath,
      workspaceRoot,
    });
    await analyzeCompletion;

    assert.equal(restoreRequestCompleted, true);
    assert.ok(
      markerSeenAt >= analyzeCompletedAt,
      `marker was written before analyze completed: marker=${markerSeenAt} analyze=${analyzeCompletedAt}`,
    );
  } finally {
    stopped = true;
    await observer;
  }
});
