import { Buffer } from 'node:buffer';
import { existsSync, readFileSync } from 'node:fs';
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
  nodeVisibilityDefaultsModule,
  materialExtensionMatchModule,
  materialPathMatchModule,
  materialFileGroupsModule,
  materialFolderGroupsModule,
  materialGroupsModule,
  symbolGroupsModule,
  mergedGroupsModule,
  legendRulesModule,
  graphControlsRegistryModule,
  graphControlsSnapshotModule,
  visibleGraphModelModule,
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
  import('../../packages/extension/src/shared/graphControls/defaults/maps.ts').then(unwrapModule),
  import('../../packages/extension/src/extension/graphView/groups/defaults/materialTheme/extensionMatch.ts').then(unwrapModule),
  import('../../packages/extension/src/extension/graphView/groups/defaults/materialTheme/pathMatch.ts').then(unwrapModule),
  import('../../packages/extension/src/extension/graphView/groups/defaults/materialTheme/files.ts').then(unwrapModule),
  import('../../packages/extension/src/extension/graphView/groups/defaults/materialTheme/folders.ts').then(unwrapModule),
  import('../../packages/extension/src/extension/graphView/groups/defaults/materialTheme/groups.ts').then(unwrapModule),
  import('../../packages/extension/src/extension/graphView/groups/defaults/symbols.ts').then(unwrapModule),
  import('../../packages/extension/src/extension/graphView/groups/merged.ts').then(unwrapModule),
  import('../../packages/extension/src/webview/search/filtering/rules.ts').then(unwrapModule),
  import('../../packages/extension/src/extension/graphView/controls/send/definitions/registry.ts').then(unwrapModule),
  import('../../packages/extension/src/extension/graphView/controls/send/definitions/snapshot.ts').then(unwrapModule),
  import('../../packages/extension/src/shared/visibleGraph/model.ts').then(unwrapModule),
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
const { createDefaultNodeVisibility } = nodeVisibilityDefaultsModule;
const { createMaterialExtensionMatcher } = materialExtensionMatchModule;
const { createMaterialPathRuleMatcher } = materialPathMatchModule;
const { collectMaterialFileGroups } = materialFileGroupsModule;
const { collectMaterialFolderGroups } = materialFolderGroupsModule;
const { getManualGroups, sortMaterialGroups } = materialGroupsModule;
const { getSymbolDefaultGroups } = symbolGroupsModule;
const { buildGraphViewMergedGroups } = mergedGroupsModule;
const { applyLegendRules } = legendRulesModule;
const { readEdgeTypes, readGraphScopeCapabilities, readNodeTypes } = graphControlsRegistryModule;
const { captureGraphControlsSnapshot } = graphControlsSnapshotModule;
const { isFileNode } = visibleGraphModelModule;

const DEFAULT_OUTPUT_PATH = 'reports/performance/visible-graph-latest.json';
const DEFAULT_ITERATIONS = 40;
const DEFAULT_WARMUP_ITERATIONS = 5;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MATERIAL_THEME_MANIFEST_PATH = path.join(
  REPO_ROOT,
  'packages',
  'extension',
  'node_modules',
  'material-icon-theme',
  'dist',
  'material-icons.json',
);

function readRawWorkspaceSettings(workspaceRoot) {
  try {
    const parsed = JSON.parse(readFileSync(
      path.join(workspaceRoot, '.codegraphy', 'settings.json'),
      'utf8',
    ));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function readBenchmarkWorkspaceSettings(workspaceRoot) {
  return {
    ...readCodeGraphyWorkspaceSettings(workspaceRoot),
    ...readRawWorkspaceSettings(workspaceRoot),
  };
}

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

function createPluginDefaultGroup(pluginInfo, pattern, value) {
  const group = {
    id: `plugin:${pluginInfo.plugin.id}:${pattern}`,
    pattern,
    color: typeof value === 'string' ? value : value.color,
    isPluginDefault: true,
    pluginId: pluginInfo.plugin.id,
    pluginName: pluginInfo.plugin.name,
  };

  if (typeof value === 'object') {
    if (value.shape2D) group.shape2D = value.shape2D;
    if (value.shape3D) group.shape3D = value.shape3D;
    if (value.imagePath) {
      group.imagePath = value.imagePath;
      group.imageUrl = value.imagePath;
    }
  }

  return group;
}

function getPluginDefaultGroups(registry, disabledPlugins) {
  const result = [];
  const addedIds = new Set();

  for (const pluginInfo of registry.list()) {
    if (disabledPlugins.has(pluginInfo.plugin.id)) continue;
    const fileColors = pluginInfo.plugin.fileColors;
    if (!fileColors) continue;

    for (const [pattern, value] of Object.entries(fileColors)) {
      const id = `plugin:${pluginInfo.plugin.id}:${pattern}`;
      if (addedIds.has(id)) continue;

      result.push(createPluginDefaultGroup(pluginInfo, pattern, value));
      addedIds.add(id);
    }
  }

  return result;
}

function loadMaterialTheme() {
  if (!existsSync(MATERIAL_THEME_MANIFEST_PATH)) {
    return null;
  }

  const manifest = JSON.parse(readFileSync(MATERIAL_THEME_MANIFEST_PATH, 'utf8'));
  return {
    extensionMatcher: manifest.fileExtensions
      ? createMaterialExtensionMatcher(manifest.fileExtensions)
      : undefined,
    iconDataByName: new Map(),
    manifest,
    manifestPath: MATERIAL_THEME_MANIFEST_PATH,
    pathMatchers: {
      fileNames: manifest.fileNames
        ? createMaterialPathRuleMatcher(manifest.fileNames)
        : undefined,
      folderNames: manifest.folderNames
        ? createMaterialPathRuleMatcher(manifest.folderNames)
        : undefined,
      folderNamesExpanded: manifest.folderNamesExpanded
        ? createMaterialPathRuleMatcher(manifest.folderNamesExpanded)
        : undefined,
    },
  };
}

function getMaterialThemeDefaultGroups(graphData, settings) {
  const theme = loadMaterialTheme();
  if (!theme) {
    return [];
  }

  const defaultNodeVisibility = createDefaultNodeVisibility();
  const includeFolderMatches =
    settings.nodeVisibility?.folder ?? defaultNodeVisibility.folder;
  const groupsById = new Map();

  for (const group of collectMaterialFileGroups(graphData, theme)) {
    groupsById.set(group.id, group);
  }

  if (includeFolderMatches) {
    for (const group of collectMaterialFolderGroups(graphData, theme)) {
      groupsById.set(group.id, group);
    }
  }

  for (const group of getManualGroups()) {
    groupsById.set(group.id, group);
  }

  return sortMaterialGroups([...groupsById.values()]);
}

function getBuiltInDefaultGroups(graphData, settings) {
  return [
    ...getMaterialThemeDefaultGroups(graphData, settings),
    ...getSymbolDefaultGroups(graphData),
  ];
}

function getResolvedLegendGroups({ graphData, registry, disabledPlugins, settings }) {
  return buildGraphViewMergedGroups(
    settings.legend ?? [],
    getBuiltInDefaultGroups(graphData, settings),
    getPluginDefaultGroups(registry, disabledPlugins),
    settings.legendVisibility ?? {},
    settings.legendOrder ?? [],
  );
}

function createSettingsConfiguration(settings) {
  return {
    get(key, defaultValue) {
      return settings[key] ?? defaultValue;
    },
  };
}

function captureGraphControls({ graphData, registry, disabledPlugins, settings }) {
  const filePaths = graphData.nodes
    .filter(isFileNode)
    .map((node) => node.id);

  return captureGraphControlsSnapshot(
    createSettingsConfiguration(settings),
    graphData,
    readNodeTypes(registry, disabledPlugins),
    readEdgeTypes(registry, disabledPlugins),
    readGraphScopeCapabilities(registry, filePaths, disabledPlugins),
  );
}

async function buildGraphDataFromGraphCache(workspacePath, userHomeDir) {
  const workspaceRoot = path.resolve(workspacePath);
  const settings = readBenchmarkWorkspaceSettings(workspaceRoot);
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
    graphControls: captureGraphControls({
      graphData,
      registry,
      disabledPlugins,
      settings,
    }),
    legends: getResolvedLegendGroups({
      graphData,
      registry,
      disabledPlugins,
      settings,
    }),
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

function createVisibleGraphScenarioConfig(settings, pluginFilterPatterns, graphControls, overrides = {}) {
  const nodeVisibility = {
    ...(settings.nodeVisibility ?? {}),
    ...(overrides.nodeVisibility ?? {}),
  };
  const edgeVisibility = {
    ...(settings.edgeVisibility ?? {}),
    ...(overrides.edgeVisibility ?? {}),
  };

  return buildVisibleGraphConfig({
    edgeTypes: graphControls?.edgeTypes ?? CORE_GRAPH_EDGE_TYPES,
    edgeVisibility,
    filterPatterns: overrides.filterPatterns ?? createActiveFilterPatterns(settings, pluginFilterPatterns),
    nodeTypes: graphControls?.nodeTypes ?? CORE_GRAPH_NODE_TYPES,
    nodeVisibility,
    searchOptions: overrides.searchOptions ?? { matchCase: false, wholeWord: false, regex: false },
    searchQuery: overrides.searchQuery ?? '',
    showOrphans: overrides.showOrphans ?? settings.showOrphans ?? true,
  });
}

function createVisibleGraphScenarios(settings, pluginFilterPatterns, graphControls) {
  return {
    current: createVisibleGraphScenarioConfig(settings, pluginFilterPatterns, graphControls),
    noFilters: createVisibleGraphScenarioConfig(settings, pluginFilterPatterns, graphControls, { filterPatterns: [] }),
    foldersOn: createVisibleGraphScenarioConfig(settings, pluginFilterPatterns, graphControls, {
      nodeVisibility: { folder: true },
    }),
    importsOff: createVisibleGraphScenarioConfig(settings, pluginFilterPatterns, graphControls, {
      edgeVisibility: { import: false },
    }),
    searchGraph: createVisibleGraphScenarioConfig(settings, pluginFilterPatterns, graphControls, {
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

function measureLegendRulesScenario(graphData, settings, pluginFilterPatterns, graphControls, legends, options) {
  const config = createVisibleGraphScenarioConfig(settings, pluginFilterPatterns, graphControls);
  const visibleGraph = deriveVisibleGraph(graphData, config).graphData ?? { nodes: [], edges: [] };

  for (let index = 0; index < options.warmupIterations; index += 1) {
    applyLegendRules(visibleGraph, legends);
  }

  const durations = [];
  let coloredGraph = visibleGraph;

  for (let index = 0; index < options.iterations; index += 1) {
    const startedAt = performance.now();
    coloredGraph = applyLegendRules(visibleGraph, legends) ?? { nodes: [], edges: [] };
    durations.push(performance.now() - startedAt);
  }

  return {
    ...summarizeDurations(durations),
    activeLegendRuleCount: legends.filter(legend => !legend.disabled).length,
    edgeCount: visibleGraph.edges.length,
    legendCount: legends.length,
    nodeCount: visibleGraph.nodes.length,
    payloadBytes: Buffer.byteLength(JSON.stringify(coloredGraph)),
  };
}

export function measureVisibleGraphScenarios(graphData, settings, options = {}) {
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const warmupIterations = options.warmupIterations ?? DEFAULT_WARMUP_ITERATIONS;
  const pluginFilterPatterns = options.pluginFilterPatterns ?? [];
  const graphControls = options.graphControls;
  const scenarios = createVisibleGraphScenarios(settings, pluginFilterPatterns, graphControls);

  return Object.fromEntries(
    Object.entries(scenarios).map(([scenarioName, config]) => [
      scenarioName,
      measureVisibleGraphScenario(graphData, config, { iterations, warmupIterations }),
    ]),
  );
}

async function measureVisibleGraph({ workspacePath, userHomeDir, iterations, warmupIterations }) {
  const { graphControls, graphData, legends, settings, pluginFilterPatterns, warmCacheGraphBuildMs } =
    await buildGraphDataFromGraphCache(workspacePath, userHomeDir);
  const visibleGraphScenarios = measureVisibleGraphScenarios(graphData, settings, {
    graphControls,
    iterations,
    pluginFilterPatterns,
    warmupIterations,
  });
  const legendRules = {
    current: measureLegendRulesScenario(graphData, settings, pluginFilterPatterns, graphControls, legends, {
      iterations,
      warmupIterations,
    }),
  };

  return {
    warmCacheGraphBuildMs,
    activeFilterPatternCount: createActiveFilterPatterns(settings, pluginFilterPatterns).length,
    pluginFilterPatternCount: pluginFilterPatterns.length,
    graphNodeCount: graphData.nodes.length,
    graphEdgeCount: graphData.edges.length,
    graphNodeTypeCount: graphControls.nodeTypes.length,
    graphEdgeTypeCount: graphControls.edgeTypes.length,
    visibleGraphScenarios,
    legendRules,
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
