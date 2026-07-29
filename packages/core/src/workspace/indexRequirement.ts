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

export function workspaceSettingChangeRequiresIndex(input: {
  key: string;
  previous: unknown;
  settings: CodeGraphyWorkspaceSettings;
  workspaceRoot: string;
}): boolean {
  const value = Reflect.get(input.settings, input.key) as unknown;
  if (isDeepStrictEqual(input.previous, value)) return false;
  if (INDEXED_SETTING_KEYS.has(input.key)) return true;
  return input.key === 'nodeVisibility'
    && workspaceRequiresSymbolAnalysisIndex(input.workspaceRoot, input.settings);
}
