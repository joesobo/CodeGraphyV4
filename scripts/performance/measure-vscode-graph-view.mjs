import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  summarizeDurations,
  writeMetrics,
} from './measure-codegraphy-monorepo.mjs';

const DEFAULT_OUTPUT_PATH = 'reports/performance/vscode-graph-view-latest.json';
const DEFAULT_ITERATIONS = 5;
const DEFAULT_WARMUP_ITERATIONS = 1;
const DEFAULT_TIMEOUT_MS = 120_000;
const IMPORTS_TOGGLE_START_EVENT = 'graphScope.edgeVisibility.optimistic';
const IMPORTS_TOGGLE_RENDERED_EVENT = 'graphStats.rendered';
const DEFAULT_PLUGIN_PACKAGE_RELATIVE_PATHS = [
  'packages/plugin-godot',
  'packages/plugin-markdown',
  'packages/plugin-particles',
  'packages/plugin-svelte',
  'packages/plugin-typescript',
  'packages/plugin-unity',
  'packages/plugin-vue',
];

function readOptionValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function hasFlag(args, name) {
  return args.includes(name);
}

function toPositiveInteger(value, defaultValue) {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
}

function parseCount(value) {
  return Number(value.replace(/,/g, ''));
}

export function parseGraphStatsLabel(label) {
  const match = /([\d,]+)\s+nodes?.*?([\d,]+)\s+connections?/i.exec(label);
  if (!match) {
    return null;
  }

  return {
    nodeCount: parseCount(match[1]),
    edgeCount: parseCount(match[2]),
  };
}

function sameGraphStats(left, right) {
  return left.nodeCount === right.nodeCount && left.edgeCount === right.edgeCount;
}

function findWebviewEventAt(sample, eventName) {
  const event = sample.webviewEvents?.find(item => item.name === eventName);
  return typeof event?.at === 'number' ? event.at : undefined;
}

export function getWebviewEventDeltaMs(
  sample,
  startEventName = IMPORTS_TOGGLE_START_EVENT,
  renderedEventName = IMPORTS_TOGGLE_RENDERED_EVENT,
) {
  const startedAt = findWebviewEventAt(sample, startEventName);
  const renderedAt = findWebviewEventAt(sample, renderedEventName);
  if (startedAt === undefined || renderedAt === undefined) {
    return undefined;
  }

  return renderedAt - startedAt;
}

export function summarizeSwitchTransitionSamples(samples) {
  const webviewEventDeltas = samples
    .map(sample => getWebviewEventDeltaMs(sample))
    .filter(value => value !== undefined);

  return {
    ...summarizeDurations(samples.map(sample => sample.durationMs)),
    ...(webviewEventDeltas.length > 0
      ? { webviewEventDelta: summarizeDurations(webviewEventDeltas) }
      : {}),
  };
}

async function readGraphStats(frame) {
  const text = await frame
    .getByText(/[\d,]+\s+nodes?.*?[\d,]+\s+connections?/i)
    .first()
    .textContent({ timeout: 1_000 })
    .catch(() => null);
  return text ? parseGraphStatsLabel(text) : null;
}

async function waitForGraphStats(frame, predicate, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const startedAt = performance.now();
  let lastStats = null;

  while (performance.now() - startedAt < timeoutMs) {
    const stats = await readGraphStats(frame);
    if (stats) {
      lastStats = stats;
      if (predicate(stats)) {
        return stats;
      }
    }

    await frame.waitForTimeout(100);
  }

  throw new Error(`Timed out waiting for graph stats. Last stats: ${JSON.stringify(lastStats)}`);
}

async function openGraphScopeEdgeTypes(frame) {
  await frame.getByTitle('Graph Scope').click({ force: true });
  const edgeTypesButton = frame.getByRole('button', { name: 'Edge Types' });
  await edgeTypesButton.click({ timeout: DEFAULT_TIMEOUT_MS });
}

function graphScopeSwitch(frame, label) {
  return frame.getByRole('switch', { name: `Toggle ${label}`, exact: true });
}

async function readSwitchEnabled(frame, label) {
  const value = await graphScopeSwitch(frame, label).getAttribute('aria-checked', {
    timeout: DEFAULT_TIMEOUT_MS,
  });
  return value === 'true';
}

async function waitForSwitchEnabled(frame, label, enabled) {
  const expected = String(enabled);
  const startedAt = performance.now();

  while (performance.now() - startedAt < DEFAULT_TIMEOUT_MS) {
    const value = await graphScopeSwitch(frame, label).getAttribute('aria-checked').catch(() => null);
    if (value === expected) {
      return;
    }

    await frame.waitForTimeout(50);
  }

  throw new Error(`Timed out waiting for ${label} switch to become ${expected}`);
}

async function enableWebviewPerformanceEvents(frame) {
  await frame.evaluate(() => {
    window.__codegraphyPerformance = {
      enabled: true,
      events: [],
      limit: 500,
    };
  });
}

async function resetWebviewPerformanceEvents(frame) {
  await frame.evaluate(() => {
    window.__codegraphyPerformance = {
      enabled: true,
      events: [],
      limit: 500,
    };
  });
}

async function readWebviewPerformanceEvents(frame) {
  return frame.evaluate(() => window.__codegraphyPerformance?.events ?? []);
}

async function waitForWebviewPerformanceEvent(frame, name, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const startedAt = performance.now();

  while (performance.now() - startedAt < timeoutMs) {
    const matched = await frame.evaluate((eventName) =>
      Boolean(window.__codegraphyPerformance?.events?.some(event => event.name === eventName)), name);
    if (matched) {
      return;
    }

    await frame.waitForTimeout(25);
  }

  throw new Error(`Timed out waiting for webview performance event: ${name}`);
}

async function measureSwitchTransition(frame, label, enabled) {
  const beforeStats = await waitForGraphStats(frame, stats => stats.nodeCount > 0);
  await resetWebviewPerformanceEvents(frame);
  const startedAt = performance.now();
  await graphScopeSwitch(frame, label).click();
  await waitForSwitchEnabled(frame, label, enabled);
  const afterStats = await waitForGraphStats(frame, stats => !sameGraphStats(stats, beforeStats));
  await waitForWebviewPerformanceEvent(frame, 'graphStats.rendered');

  return {
    durationMs: Math.round(performance.now() - startedAt),
    enabled,
    beforeStats,
    afterStats,
    webviewEvents: await readWebviewPerformanceEvents(frame),
  };
}

async function restoreWorkspaceSettings(settingsPath, originalSettings) {
  if (originalSettings === null) {
    return;
  }

  await writeFile(settingsPath, originalSettings);
}

async function measureVSCodeGraphView({
  iterations,
  outputPath,
  warmupIterations,
  workspacePath,
}) {
  const workspaceRoot = path.resolve(workspacePath);
  const settingsPath = path.join(workspaceRoot, '.codegraphy', 'settings.json');
  const originalSettings = await readFile(settingsPath, 'utf8').catch(() => null);
  const {
    cleanupVSCode,
    launchVSCodeWithWorkspace,
    openGraphView,
    waitForGraphFrame,
  } = await import('../../packages/extension/tests/acceptance/graphView/vscode.ts');
  let vscode = null;

  try {
    const launchStartedAt = performance.now();
    vscode = await launchVSCodeWithWorkspace(workspaceRoot, {
      pluginPackageRelativePaths: DEFAULT_PLUGIN_PACKAGE_RELATIVE_PATHS,
    });
    const launchMs = Math.round(performance.now() - launchStartedAt);
    const openStartedAt = performance.now();
    await openGraphView(vscode.page);
    const frame = await waitForGraphFrame(vscode.page);
    await enableWebviewPerformanceEvents(frame);
    const initialStats = await waitForGraphStats(frame, stats => stats.nodeCount > 0);
    const firstGraphReadyMs = Math.round(performance.now() - openStartedAt);

    await openGraphScopeEdgeTypes(frame);
    const initialImportsEnabled = await readSwitchEnabled(frame, 'Imports');
    let nextImportsEnabled = !initialImportsEnabled;
    const samples = [];

    for (let index = 0; index < warmupIterations + iterations; index += 1) {
      const sample = await measureSwitchTransition(frame, 'Imports', nextImportsEnabled);
      if (index >= warmupIterations) {
        samples.push(sample);
      }
      nextImportsEnabled = !nextImportsEnabled;
    }

    if (await readSwitchEnabled(frame, 'Imports') !== initialImportsEnabled) {
      await measureSwitchTransition(frame, 'Imports', initialImportsEnabled);
    }

    const measurements = {
      vscodeLaunchMs: launchMs,
      firstGraphReadyMs,
      initialStats,
      importsToggle: {
        ...summarizeSwitchTransitionSamples(samples),
        samples,
      },
    };

    await writeMetrics({ outputPath, workspacePath: workspaceRoot, measurements });
    return measurements;
  } finally {
    if (vscode) {
      await cleanupVSCode(vscode);
    }
    await restoreWorkspaceSettings(settingsPath, originalSettings);
  }
}

function printUsage() {
  process.stdout.write([
    'Usage:',
    '  pnpm exec tsx scripts/performance/measure-vscode-graph-view.mjs [--workspace <path>] [--iterations <n>] [--warmup <n>] [--output <path>]',
    '',
    'Launches Extension Development Host, opens CodeGraphy, and times rendered Graph Scope toggle latency.',
  ].join('\n'));
}

async function runCli(argv) {
  if (hasFlag(argv, '--help')) {
    printUsage();
    return;
  }

  const workspacePath = readOptionValue(argv, '--workspace') ?? process.cwd();
  const outputPath = readOptionValue(argv, '--output') ?? DEFAULT_OUTPUT_PATH;
  const iterations = toPositiveInteger(readOptionValue(argv, '--iterations'), DEFAULT_ITERATIONS);
  const warmupIterations = toPositiveInteger(readOptionValue(argv, '--warmup'), DEFAULT_WARMUP_ITERATIONS);

  await measureVSCodeGraphView({
    iterations,
    outputPath,
    warmupIterations,
    workspacePath,
  });
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  runCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
