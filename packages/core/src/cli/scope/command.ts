import { CORE_GRAPH_NODE_TYPES } from '../../graphControls/defaults/definitions';
import {
  hasRequiredAnalysisCacheTiers,
  requiresSymbolAnalysisCacheTier,
  SYMBOLS_ANALYSIS_CACHE_TIER,
} from '../../analysis/fileAnalysis';
import { readWorkspaceAnalysisDatabaseSnapshot } from '../../graphCache/database/storage';
import { readCodeGraphyWorkspaceStatus } from '../../workspace/status';
import { CORE_GRAPH_EDGE_TYPES, resolveSavedGraphScope } from '../../workspace/graphScopeSettings';
import { resolveCodeGraphyWorkspacePath } from '../../workspace/requestPaths';
import {
  readCodeGraphyWorkspaceSettingsOrInitial,
  patchCodeGraphyWorkspaceSettingRecord,
} from '../../workspace/settings';
import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parseTypes';

interface ScopeCommandDependencies {
  cwd(): string;
}

const DEFAULT_DEPENDENCIES: ScopeCommandDependencies = { cwd: () => process.cwd() };
function createScopeOutput(
  settings: ReturnType<typeof readCodeGraphyWorkspaceSettingsOrInitial>,
  workspaceRoot: string,
): string {
  const status = readCodeGraphyWorkspaceStatus(workspaceRoot);
  const snapshot = status.hasGraphCache
    ? readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot)
    : { files: [], relations: [], symbols: [] };
  const pluginNodeDefinitions = snapshot.files.flatMap(file => file.analysis.nodeTypes ?? []);
  const declaredPluginEdgeTypes = snapshot.files.flatMap(file => file.analysis.edgeTypes ?? []);
  const resolved = resolveSavedGraphScope(settings, undefined, {
    nodes: pluginNodeDefinitions,
    edges: declaredPluginEdgeTypes,
  });
  const nodeVisibility = resolved.nodes;
  const edgeVisibility = resolved.edges;
  const savedNodeTypes = new Set(Object.keys(nodeVisibility));
  const definitions = new Map(CORE_GRAPH_NODE_TYPES.map(definition => [definition.id, definition]));
  const observedSymbolKinds = new Set(snapshot.symbols.map(symbol => symbol.kind));
  const availableNodeTypes = new Set(['file', 'folder', 'package']);
  const observedPluginNodeTypes = snapshot.files.flatMap(file => file.analysis.nodes?.map(node => node.nodeType) ?? []);
  for (const type of observedPluginNodeTypes) availableNodeTypes.add(type);
  for (const definition of pluginNodeDefinitions) {
    definitions.set(definition.id, definition);
    availableNodeTypes.add(definition.id);
  }
  for (const definition of CORE_GRAPH_NODE_TYPES) {
    if (definition.matchSymbolKinds?.some(kind => observedSymbolKinds.has(kind))) {
      availableNodeTypes.add(definition.id);
      if (definition.parentId) availableNodeTypes.add(definition.parentId);
    }
  }
  const nodeTypes = [...new Set([...definitions.keys(), ...savedNodeTypes, ...availableNodeTypes])].sort();
  const observedEdgeTypes = new Set<string>(snapshot.relations.map(relation => relation.kind));
  for (const definition of declaredPluginEdgeTypes) observedEdgeTypes.add(definition.id);
  const edgeTypes = [...new Set([...CORE_GRAPH_EDGE_TYPES, ...Object.keys(edgeVisibility), ...observedEdgeTypes])].sort();
  const requiresSymbols = requiresSymbolAnalysisCacheTier(nodeVisibility);
  const indexRequired = requiresSymbols && (
    !status.hasGraphCache
    || snapshot.files.some(file => !hasRequiredAnalysisCacheTiers(
      file.analysis,
      [SYMBOLS_ANALYSIS_CACHE_TIER],
    ))
  );
  return JSON.stringify({
    nodes: nodeTypes.map(type => ({
      type,
      enabled: nodeVisibility[type] ?? definitions.get(type)?.defaultVisible ?? false,
      available: availableNodeTypes.has(type),
    })),
    edges: edgeTypes.map(type => ({
      type,
      enabled: edgeVisibility[type] ?? true,
      available: observedEdgeTypes.has(type),
    })),
    indexRequired,
    ...(indexRequired
      ? { action: 'Run `codegraphy index` to hydrate the required symbol analysis.' }
      : {}),
  });
}

export function runScopeCommand(
  command: CliCommand,
  dependencies: ScopeCommandDependencies = DEFAULT_DEPENDENCIES,
): CommandExecutionResult {
  const workspaceRoot = resolveCodeGraphyWorkspacePath(command.workspacePath, dependencies.cwd());
  let settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  const kind = command.arguments?.kind;
  const type = command.arguments?.type;
  const enabled = command.arguments?.enabled;

  if ((kind === 'node' || kind === 'edge') && typeof type === 'string' && typeof enabled === 'boolean') {
    const updates: Record<string, boolean> = { [type]: enabled };
    if (kind === 'node') {
      if (enabled) {
        const definitions = new Map(CORE_GRAPH_NODE_TYPES.map(definition => [definition.id, definition]));
        let parentId = definitions.get(type)?.parentId;
        while (parentId) {
          updates[parentId] = true;
          parentId = definitions.get(parentId)?.parentId;
        }
      }
    }
    patchCodeGraphyWorkspaceSettingRecord(
      workspaceRoot,
      kind === 'node' ? 'nodeVisibility' : 'edgeVisibility',
      updates,
    );
    settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  }

  return { exitCode: 0, output: createScopeOutput(settings, workspaceRoot) };
}
