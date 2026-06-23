import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
const WEBVIEW_PERFORMANCE_EVENT_LIMIT = 500;
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

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function parseExtensionHostPerformanceLog(logText) {
  const events = [];

  for (const line of logText.split('\n')) {
    if (!line.trim()) {
      continue;
    }

    try {
      const parsed = JSON.parse(line);
      if (typeof parsed.name !== 'string' || typeof parsed.at !== 'number') {
        continue;
      }

      events.push({
        name: parsed.name,
        at: parsed.at,
        ...(isPlainObject(parsed.detail) ? { detail: parsed.detail } : {}),
      });
    } catch {
      // Ignore partial or unrelated lines so a long-running host process cannot poison the metrics file.
    }
  }

  const firstEventAt = events[0]?.at ?? 0;
  return events.map(event => ({
    ...event,
    offsetMs: Math.round(event.at - firstEventAt),
  }));
}

async function readExtensionHostPerformanceEvents(logPath) {
  const logText = await readFile(logPath, 'utf8').catch(() => '');
  return parseExtensionHostPerformanceLog(logText);
}

function createExtensionHostPerformanceLogPath(outputPath) {
  const resolvedOutputPath = path.resolve(outputPath);
  const extension = path.extname(resolvedOutputPath);
  const basename = path.basename(resolvedOutputPath, extension);
  return path.join(path.dirname(resolvedOutputPath), `${basename}-extension-host.jsonl`);
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

export function summarizeWebviewEventDurations(events) {
  const durationsByEventName = new Map();

  for (const event of events) {
    if (typeof event.durationMs !== 'number') {
      continue;
    }

    const durations = durationsByEventName.get(event.name) ?? [];
    durations.push(event.durationMs);
    durationsByEventName.set(event.name, durations);
  }

  return Object.fromEntries(
    [...durationsByEventName.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, durations]) => [name, summarizeDurations(durations)]),
  );
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

async function installWebviewPerformanceInitScript(page) {
  await page.addInitScript((limit) => {
    window.__codegraphyPerformance = {
      enabled: true,
      events: [],
      limit,
    };
  }, WEBVIEW_PERFORMANCE_EVENT_LIMIT);
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
  await frame.evaluate((limit) => {
    const existing = window.__codegraphyPerformance;
    window.__codegraphyPerformance = {
      enabled: true,
      events: Array.isArray(existing?.events) ? existing.events : [],
      limit,
    };
  }, WEBVIEW_PERFORMANCE_EVENT_LIMIT);
}

async function resetWebviewPerformanceEvents(frame) {
  await frame.evaluate((limit) => {
    window.__codegraphyPerformance = {
      enabled: true,
      events: [],
      limit,
    };
  }, WEBVIEW_PERFORMANCE_EVENT_LIMIT);
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
  const extensionHostLogPath = createExtensionHostPerformanceLogPath(outputPath);
  const originalSettings = await readFile(settingsPath, 'utf8').catch(() => null);
  const {
    cleanupVSCode,
    launchVSCodeWithWorkspace,
    openGraphView,
    waitForGraphFrame,
  } = await import('../../packages/extension/tests/acceptance/graphView/vscode.ts');
  let vscode = null;

  try {
    await mkdir(path.dirname(extensionHostLogPath), { recursive: true });
    await writeFile(extensionHostLogPath, '');
    const launchStartedAt = performance.now();
    vscode = await launchVSCodeWithWorkspace(workspaceRoot, {
      extensionPerformanceLogPath: extensionHostLogPath,
      pluginPackageRelativePaths: DEFAULT_PLUGIN_PACKAGE_RELATIVE_PATHS,
    });
    const launchMs = Math.round(performance.now() - launchStartedAt);
    await installWebviewPerformanceInitScript(vscode.page);
    const openStartedAt = performance.now();
    await openGraphView(vscode.page);
    const openGraphCommandMs = Math.round(performance.now() - openStartedAt);
    const frameStartedAt = performance.now();
    const frame = await waitForGraphFrame(vscode.page, DEFAULT_TIMEOUT_MS);
    const graphFrameReadyMs = Math.round(performance.now() - frameStartedAt);
    await enableWebviewPerformanceEvents(frame);
    const statsStartedAt = performance.now();
    const initialStats = await waitForGraphStats(frame, stats => stats.nodeCount > 0);
    const graphStatsReadyMs = Math.round(performance.now() - statsStartedAt);
    const firstGraphReadyMs = Math.round(performance.now() - openStartedAt);
    const firstGraphReadyWebviewEvents = await readWebviewPerformanceEvents(frame);

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
      firstGraphReadyPhases: {
        openGraphCommandMs,
        graphFrameReadyMs,
        graphStatsReadyMs,
      },
      firstGraphReadyWebviewStages: summarizeWebviewEventDurations(firstGraphReadyWebviewEvents),
      firstGraphReadyWebviewEvents,
      firstGraphReadyExtensionHostLogPath: extensionHostLogPath,
      extensionHostEvents: await readExtensionHostPerformanceEvents(extensionHostLogPath),
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
