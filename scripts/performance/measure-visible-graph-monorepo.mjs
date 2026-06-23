import { Buffer } from 'node:buffer';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  summarizeDurations,
  writeMetrics,
} from './measure-codegraphy-monorepo.mjs';

function unwrapModule(module) {
  return module.default ?? module;
}

const [
  graphDataModule,
  graphCacheStorageModule,
  analysisFactsModule,
  activityStateModule,
  installedPluginCacheModule,
  settingsStorageModule,
  settingsDefaultsModule,
  indexingRegistryModule,
  visibleGraphModule,
  edgeTypesModule,
  nodeTypesModule,
  visibleGraphConfigModule,
] = await Promise.all([
  import('../../packages/core/src/graph/data.ts').then(unwrapModule),
  import('../../packages/core/src/graphCache/database/storage.ts').then(unwrapModule),
  import('../../packages/core/src/plugins/activityState/analysisFacts.ts').then(unwrapModule),
  import('../../packages/core/src/plugins/activityState/model.ts').then(unwrapModule),
  import('../../packages/core/src/plugins/installedPluginCache/storage.ts').then(unwrapModule),
  import('../../packages/core/src/workspace/settingsStorage.ts').then(unwrapModule),
  import('../../packages/core/src/workspace/settingsDefaults.ts').then(unwrapModule),
  import('../../packages/core/src/indexing/registry.ts').then(unwrapModule),
  import('../../packages/extension/src/shared/visibleGraph/index.ts').then(unwrapModule),
  import('../../packages/extension/src/shared/graphControls/defaults/edgeTypes.ts').then(unwrapModule),
  import('../../packages/extension/src/shared/graphControls/defaults/nodeTypes.ts').then(unwrapModule),
  import('../../packages/extension/src/webview/search/visibleGraphConfig.ts').then(unwrapModule),
]);

const { buildWorkspaceGraphDataFromAnalysis } = graphDataModule;
const { loadWorkspaceAnalysisDatabaseCache } = graphCacheStorageModule;
const { filterInactivePluginFileAnalysis } = analysisFactsModule;
const { createDisabledPluginSet, createPluginActivityState } = activityStateModule;
const { readCodeGraphyInstalledPluginCache } = installedPluginCacheModule;
const { readCodeGraphyWorkspaceSettings } = settingsStorageModule;
const { CODEGRAPHY_MARKDOWN_PLUGIN_ID } = settingsDefaultsModule;
const { createWorkspaceIndexRegistry } = indexingRegistryModule;
const { deriveVisibleGraph } = visibleGraphModule;
const { CORE_GRAPH_EDGE_TYPES } = edgeTypesModule;
const { CORE_GRAPH_NODE_TYPES } = nodeTypesModule;
const { buildVisibleGraphConfig } = visibleGraphConfigModule;

const DEFAULT_OUTPUT_PATH = 'reports/performance/visible-graph-latest.json';
const DEFAULT_ITERATIONS = 40;
const DEFAULT_WARMUP_ITERATIONS = 5;

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

function collectDirectoryPaths(filePaths) {
  const directories = new Set();

  for (const filePath of filePaths) {
    let directory = path.posix.dirname(filePath.replace(/\\/g, '/'));
    while (directory && directory !== '.') {
      directories.add(directory);
      directory = path.posix.dirname(directory);
    }
  }

  return [...directories].sort();
}

function createActivePluginSet(settings, userHomeDir) {
  const installedPluginCache = readCodeGraphyInstalledPluginCache({
    ...(userHomeDir ? { homeDir: userHomeDir } : {}),
  });
  const activityState = createPluginActivityState({
    settings,
    installedPlugins: installedPluginCache.plugins,
    builtInPluginIds: [CODEGRAPHY_MARKDOWN_PLUGIN_ID],
  });
  return new Set(activityState.activePluginIds);
}

async function buildGraphDataFromGraphCache(workspacePath, userHomeDir) {
  const workspaceRoot = path.resolve(workspacePath);
  const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);
  const disabledPlugins = createDisabledPluginSet(settings);
  const activePluginIds = createActivePluginSet(settings, userHomeDir);
  const { registry } = await createWorkspaceIndexRegistry(
    { userHomeDir },
    settings,
    workspaceRoot,
    disabledPlugins,
  );
  const pluginFilterPatterns = registry.getPluginFilterPatterns(disabledPlugins);
  const cache = loadWorkspaceAnalysisDatabaseCache(workspaceRoot);
  const fileAnalysis = new Map(
    Object.entries(cache.files).map(([filePath, entry]) => [filePath, entry.analysis]),
  );
  const graphBuildStartedAt = performance.now();
  const graphData = buildWorkspaceGraphDataFromAnalysis({
    cacheFiles: cache.files,
    churnCounts: {},
    directoryPaths: collectDirectoryPaths(Object.keys(cache.files)),
    disabledPlugins,
    fileAnalysis: filterInactivePluginFileAnalysis(fileAnalysis, activePluginIds),
    getPluginForFile: () => undefined,
    nodeVisibility: settings.nodeVisibility,
    showOrphans: settings.showOrphans,
    workspaceRoot,
  });

  return {
    graphData,
    warmCacheGraphBuildMs: Math.round(performance.now() - graphBuildStartedAt),
    settings,
    pluginFilterPatterns,
  };
}

function createActiveFilterPatterns(settings, pluginFilterPatterns = []) {
  const disabledCustomPatterns = new Set(settings.disabledCustomFilterPatterns ?? []);
  const disabledPluginPatterns = new Set(settings.disabledPluginFilterPatterns ?? []);
  return [
    ...pluginFilterPatterns.filter(pattern => !disabledPluginPatterns.has(pattern)),
    ...(settings.filterPatterns ?? []).filter(pattern => !disabledCustomPatterns.has(pattern)),
  ];
}

function createVisibleGraphScenarioConfig(settings, pluginFilterPatterns, overrides = {}) {
  const nodeVisibility = {
    ...(settings.nodeVisibility ?? {}),
    ...(overrides.nodeVisibility ?? {}),
  };
  const edgeVisibility = {
    ...(settings.edgeVisibility ?? {}),
    ...(overrides.edgeVisibility ?? {}),
  };

  return buildVisibleGraphConfig({
    edgeTypes: CORE_GRAPH_EDGE_TYPES,
    edgeVisibility,
    filterPatterns: overrides.filterPatterns ?? createActiveFilterPatterns(settings, pluginFilterPatterns),
    nodeTypes: CORE_GRAPH_NODE_TYPES,
    nodeVisibility,
    searchOptions: overrides.searchOptions ?? { matchCase: false, wholeWord: false, regex: false },
    searchQuery: overrides.searchQuery ?? '',
    showOrphans: overrides.showOrphans ?? settings.showOrphans ?? true,
  });
}

function createVisibleGraphScenarios(settings, pluginFilterPatterns) {
  return {
    current: createVisibleGraphScenarioConfig(settings, pluginFilterPatterns),
    noFilters: createVisibleGraphScenarioConfig(settings, pluginFilterPatterns, { filterPatterns: [] }),
    foldersOn: createVisibleGraphScenarioConfig(settings, pluginFilterPatterns, {
      nodeVisibility: { folder: true },
    }),
    importsOff: createVisibleGraphScenarioConfig(settings, pluginFilterPatterns, {
      edgeVisibility: { import: false },
    }),
    searchGraph: createVisibleGraphScenarioConfig(settings, pluginFilterPatterns, {
      searchQuery: 'graph',
    }),
  };
}

function measureVisibleGraphScenario(graphData, config, options) {
  for (let index = 0; index < options.warmupIterations; index += 1) {
    deriveVisibleGraph(graphData, config);
  }

  const durations = [];
  let visibleGraph = graphData;
  let regexError = null;

  for (let index = 0; index < options.iterations; index += 1) {
    const startedAt = performance.now();
    const result = deriveVisibleGraph(graphData, config);
    durations.push(performance.now() - startedAt);
    visibleGraph = result.graphData ?? { nodes: [], edges: [] };
    regexError = result.regexError;
  }

  return {
    ...summarizeDurations(durations),
    nodeCount: visibleGraph.nodes.length,
    edgeCount: visibleGraph.edges.length,
    payloadBytes: Buffer.byteLength(JSON.stringify(visibleGraph)),
    ...(regexError ? { regexError } : {}),
  };
}

export function measureVisibleGraphScenarios(graphData, settings, options = {}) {
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const warmupIterations = options.warmupIterations ?? DEFAULT_WARMUP_ITERATIONS;
  const pluginFilterPatterns = options.pluginFilterPatterns ?? [];
  const scenarios = createVisibleGraphScenarios(settings, pluginFilterPatterns);

  return Object.fromEntries(
    Object.entries(scenarios).map(([scenarioName, config]) => [
      scenarioName,
      measureVisibleGraphScenario(graphData, config, { iterations, warmupIterations }),
    ]),
  );
}

async function measureVisibleGraph({ workspacePath, userHomeDir, iterations, warmupIterations }) {
  const { graphData, settings, pluginFilterPatterns, warmCacheGraphBuildMs } =
    await buildGraphDataFromGraphCache(workspacePath, userHomeDir);
  const visibleGraphScenarios = measureVisibleGraphScenarios(graphData, settings, {
    iterations,
    pluginFilterPatterns,
    warmupIterations,
  });

  return {
    warmCacheGraphBuildMs,
    activeFilterPatternCount: createActiveFilterPatterns(settings, pluginFilterPatterns).length,
    pluginFilterPatternCount: pluginFilterPatterns.length,
    graphNodeCount: graphData.nodes.length,
    graphEdgeCount: graphData.edges.length,
    visibleGraphScenarios,
  };
}

function printUsage() {
  process.stdout.write([
    'Usage:',
    '  pnpm exec tsx scripts/performance/measure-visible-graph-monorepo.mjs [--workspace <path>] [--user-home <path>] [--iterations <n>] [--warmup <n>] [--output <path>]',
    '',
    'Loads the existing Graph Cache and times webview visible-graph derivation scenarios.',
  ].join('\n'));
}

async function runCli(argv) {
  if (hasFlag(argv, '--help')) {
    printUsage();
    return;
  }

  const workspacePath = readOptionValue(argv, '--workspace') ?? process.cwd();
  const outputPath = readOptionValue(argv, '--output') ?? DEFAULT_OUTPUT_PATH;
  const userHomeDir = readOptionValue(argv, '--user-home');
  const iterations = toPositiveInteger(readOptionValue(argv, '--iterations'), DEFAULT_ITERATIONS);
  const warmupIterations = toPositiveInteger(readOptionValue(argv, '--warmup'), DEFAULT_WARMUP_ITERATIONS);
  const measurements = await measureVisibleGraph({
    workspacePath,
    userHomeDir,
    iterations,
    warmupIterations,
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
