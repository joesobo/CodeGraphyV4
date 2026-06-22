import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_OUTPUT_PATH = 'reports/performance/monorepo-latest.json';

function createMetricsRecord({ workspacePath, measurements }) {
  return {
    version: 1,
    recordedAt: new Date().toISOString(),
    workspacePath: path.resolve(workspacePath),
    measurements: { ...measurements },
  };
}

function roundMs(value) {
  return Math.round(value);
}

function readPercentile(sortedSamples, percentile) {
  if (sortedSamples.length === 0) {
    return 0;
  }

  const rank = Math.ceil((percentile / 100) * sortedSamples.length);
  return sortedSamples[Math.max(0, Math.min(sortedSamples.length - 1, rank - 1))];
}

export function summarizeDurations(samples) {
  const sortedSamples = [...samples].sort((left, right) => left - right);
  const midpoint = Math.floor(sortedSamples.length / 2);
  const median = sortedSamples.length % 2 === 0
    ? (sortedSamples[midpoint - 1] + sortedSamples[midpoint]) / 2
    : sortedSamples[midpoint];

  return {
    iterations: sortedSamples.length,
    minMs: roundMs(sortedSamples[0] ?? 0),
    medianMs: roundMs(median ?? 0),
    p95Ms: roundMs(readPercentile(sortedSamples, 95)),
    maxMs: roundMs(sortedSamples.at(-1) ?? 0),
  };
}

export async function writeMetrics({ outputPath, workspacePath, measurements }) {
  const metrics = createMetricsRecord({ workspacePath, measurements });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(metrics, null, 2)}\n`);
  return metrics;
}

function parseJsonResult(logText) {
  const jsonStart = logText.lastIndexOf('\n{');
  if (jsonStart < 0) {
    return {};
  }

  const jsonEnd = logText.indexOf('\n}', jsonStart);
  if (jsonEnd < 0) {
    return {};
  }

  try {
    return JSON.parse(logText.slice(jsonStart + 1, jsonEnd + 2));
  } catch {
    return {};
  }
}

function parseTimeSummary(logText) {
  const match = logText.match(/^\s*([\d.]+)\s+real\s+([\d.]+)\s+user\s+([\d.]+)\s+sys$/m);
  if (!match) {
    return {};
  }

  return {
    coldIndexMs: Math.round(Number(match[1]) * 1000),
    coldIndexUserMs: Math.round(Number(match[2]) * 1000),
    coldIndexSystemMs: Math.round(Number(match[3]) * 1000),
  };
}

function parseMemorySummary(logText) {
  const maxResidentMatch = logText.match(/^\s*(\d+)\s+maximum resident set size$/m);
  const peakMemoryMatch = logText.match(/^\s*(\d+)\s+peak memory footprint$/m);

  return {
    ...(maxResidentMatch ? { maxResidentSetBytes: Number(maxResidentMatch[1]) } : {}),
    ...(peakMemoryMatch ? { peakMemoryFootprintBytes: Number(peakMemoryMatch[1]) } : {}),
  };
}

function parseLogScalar(value) {
  if (/^-?\d+(?:\.\d+)?$/.test(value)) {
    return Number(value);
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
}

function parsePhaseDetail(detail) {
  const separatorIndex = detail.indexOf('=');
  if (separatorIndex < 0) {
    return {};
  }

  const key = detail.slice(0, separatorIndex).trim();
  const value = detail.slice(separatorIndex + 1).trim();
  if (!key) {
    return {};
  }

  return { [key]: parseLogScalar(value) };
}

function parseIndexPhaseSummaries(logText) {
  const indexPhases = {};
  const phaseLinePattern = /^\[CodeGraphy\] Indexing phase complete: (.+)$/gm;
  for (const match of logText.matchAll(phaseLinePattern)) {
    const phaseMetrics = match[1]
      .split(',')
      .map(detail => parsePhaseDetail(detail))
      .reduce((merged, detail) => ({ ...merged, ...detail }), {});
    if (typeof phaseMetrics.phase === 'string') {
      indexPhases[phaseMetrics.phase] = phaseMetrics;
    }
  }

  return Object.keys(indexPhases).length > 0 ? { indexPhases } : {};
}

async function readGraphCacheBytes(workspacePath, graphCache) {
  if (typeof graphCache !== 'string' || graphCache.length === 0) {
    return {};
  }

  try {
    const graphCachePath = path.resolve(workspacePath, graphCache);
    return { graphCacheBytes: (await stat(graphCachePath)).size };
  } catch {
    return {};
  }
}

export async function readColdIndexLogMetrics({ logPath, workspacePath }) {
  const logText = await readFile(logPath, 'utf8');
  const result = parseJsonResult(logText);
  const graphCache = result.graphCache;

  return {
    ...parseTimeSummary(logText),
    ...parseMemorySummary(logText),
    ...parseIndexPhaseSummaries(logText),
    ...(typeof result.files === 'number' ? { fileCount: result.files } : {}),
    ...(typeof result.nodes === 'number' ? { nodeCount: result.nodes } : {}),
    ...(typeof result.edges === 'number' ? { edgeCount: result.edges } : {}),
    ...(typeof graphCache === 'string' ? { graphCache } : {}),
    ...(typeof graphCache === 'string'
      ? await readGraphCacheBytes(workspacePath, graphCache)
      : {}),
  };
}

function readOptionValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function hasFlag(args, name) {
  return args.includes(name);
}

function printUsage() {
  process.stdout.write([
    'Usage:',
    '  node scripts/performance/measure-codegraphy-monorepo.mjs --index-log <path> [--workspace <path>] [--output <path>]',
    '',
    'Writes a bounded JSON metric summary. Raw logs stay under reports/performance/.',
  ].join('\n'));
}

async function runCli(argv) {
  if (hasFlag(argv, '--help')) {
    printUsage();
    return;
  }

  const workspacePath = readOptionValue(argv, '--workspace') ?? process.cwd();
  const outputPath = readOptionValue(argv, '--output') ?? DEFAULT_OUTPUT_PATH;
  const indexLogPath = readOptionValue(argv, '--index-log');

  if (!indexLogPath) {
    throw new Error('Missing required --index-log <path>');
  }

  const measurements = await readColdIndexLogMetrics({
    logPath: indexLogPath,
    workspacePath,
  });
  await writeMetrics({ outputPath, workspacePath, measurements });
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  runCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
