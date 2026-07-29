import { isDeepStrictEqual } from 'node:util';
import {
  hasRequiredAnalysisCacheTiers,
  requiresSymbolAnalysisCacheTier,
  SYMBOLS_ANALYSIS_CACHE_TIER,
} from '../analysis/fileAnalysis';
import { readWorkspaceAnalysisDatabaseSnapshot } from '../graphCache/database/storage';
import { resolveSavedGraphScope } from './graphScopeSettings';
import type { CodeGraphyWorkspaceSettings } from './settings';
import { readCodeGraphyWorkspaceStatus } from './status';

const INDEXED_SETTING_KEYS = new Set([
  'include',
  'maxFiles',
  'pluginData',
  'plugins',
  'respectGitignore',
]);
const FILTER_SETTING_KEYS = new Set([
  'filterPatterns',
  'disabledCustomFilterPatterns',
]);

interface SymbolAnalysisIndexInput {
  files: ReturnType<typeof readWorkspaceAnalysisDatabaseSnapshot>['files'];
  hasGraphCache: boolean;
  nodeVisibility: Readonly<Record<string, boolean>>;
}

export function requiresSymbolAnalysisIndex(input: SymbolAnalysisIndexInput): boolean {
  return requiresSymbolAnalysisCacheTier(input.nodeVisibility) && (
    !input.hasGraphCache
    || input.files.some(file => !hasRequiredAnalysisCacheTiers(
      file.analysis,
      [SYMBOLS_ANALYSIS_CACHE_TIER],
    ))
  );
}

function workspaceRequiresSymbolAnalysisIndex(
  workspaceRoot: string,
  settings: CodeGraphyWorkspaceSettings,
): boolean {
  const status = readCodeGraphyWorkspaceStatus(workspaceRoot);
  const snapshot = readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);
  const scope = resolveSavedGraphScope(settings, snapshot.graph, {
    nodes: snapshot.files.flatMap(file => file.analysis.nodeTypes ?? []),
    edges: snapshot.files.flatMap(file => file.analysis.edgeTypes ?? []),
  });
  return requiresSymbolAnalysisIndex({
    files: snapshot.files,
    hasGraphCache: status.hasGraphCache,
    nodeVisibility: scope.nodes,
  });
}

function activeFilterPatterns(
  filterPatterns: readonly string[],
  disabledPatterns: readonly string[],
): Set<string> {
  const disabled = new Set(disabledPatterns);
  return new Set(filterPatterns.filter(pattern => !disabled.has(pattern)));
}

function filterChangeBroadensDiscovery(input: {
  key: string;
  previous: unknown;
  settings: CodeGraphyWorkspaceSettings;
}): boolean {
  const previousFilterPatterns = input.key === 'filterPatterns'
    ? input.previous as string[]
    : input.settings.filterPatterns;
  const previousDisabledPatterns = input.key === 'disabledCustomFilterPatterns'
    ? input.previous as string[]
    : input.settings.disabledCustomFilterPatterns;
  const previousActive = activeFilterPatterns(previousFilterPatterns, previousDisabledPatterns);
  const currentActive = activeFilterPatterns(
    input.settings.filterPatterns,
    input.settings.disabledCustomFilterPatterns,
  );
  return [...previousActive].some(pattern => !currentActive.has(pattern));
}

export function workspaceSettingChangeRequiresIndex(input: {
  key: string;
  previous: unknown;
  settings: CodeGraphyWorkspaceSettings;
  workspaceRoot: string;
}): boolean {
  const value = Reflect.get(input.settings, input.key) as unknown;
  if (isDeepStrictEqual(input.previous, value)) return false;
  if (INDEXED_SETTING_KEYS.has(input.key)) return true;
  if (FILTER_SETTING_KEYS.has(input.key)) return filterChangeBroadensDiscovery(input);
  return input.key === 'nodeVisibility'
    && workspaceRequiresSymbolAnalysisIndex(input.workspaceRoot, input.settings);
}
