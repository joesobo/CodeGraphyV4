import { CORE_GRAPH_NODE_TYPES } from '../../graphControls/defaults/definitions';
import {
  hasRequiredAnalysisCacheTiers,
  requiresSymbolAnalysisCacheTier,
  SYMBOLS_ANALYSIS_CACHE_TIER,
} from '../../analysis/fileAnalysis';
import { readWorkspaceAnalysisDatabaseSnapshot } from '../../graphCache/database/storage';
import { readCodeGraphyWorkspaceStatus } from '../../workspace/status';
import { CORE_GRAPH_EDGE_TYPES } from '../../graphScope/defaults';
import { resolveSavedGraphScope } from '../../workspace/graphScopeSettings';
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

type CoreNodeDefinition = typeof CORE_GRAPH_NODE_TYPES[number];

function hasNodeTypeAncestor(
  definition: CoreNodeDefinition,
  ancestorId: string,
  definitions: ReadonlyMap<string, CoreNodeDefinition>,
): boolean {
  let parentId = definition.parentId;
  while (parentId) {
    if (parentId === ancestorId) return true;
    parentId = definitions.get(parentId)?.parentId;
  }
  return false;
}

function isCoveredNodeType(
  selected: CoreNodeDefinition,
  candidate: CoreNodeDefinition,
  definitions: ReadonlyMap<string, CoreNodeDefinition>,
): boolean {
  if (candidate.id === selected.id) return false;
  if (!selected.matchSymbolKinds) {
    return hasNodeTypeAncestor(candidate, selected.id, definitions);
  }
  return Boolean(candidate.matchSymbolKinds?.every(kind => selected.matchSymbolKinds?.includes(kind)));
}

function createNodeVisibilityUpdates(type: string, enabled: boolean): Record<string, boolean> {
  const updates: Record<string, boolean> = { [type]: enabled };
  if (!enabled) return updates;

  const definitions = new Map(CORE_GRAPH_NODE_TYPES.map(definition => [definition.id, definition]));
  const selected = definitions.get(type);
  if (selected) {
    for (const candidate of CORE_GRAPH_NODE_TYPES) {
      if (isCoveredNodeType(selected, candidate, definitions)) updates[candidate.id] = true;
    }
  }

  let parentId = selected?.parentId;
  while (parentId) {
    updates[parentId] = true;
    parentId = definitions.get(parentId)?.parentId;
  }
  return updates;
}

interface ScopeOutputSelection {
  edgeTypes: ReadonlySet<string>;
  nodeTypes: ReadonlySet<string>;
}

function createScopeOutput(
  settings: ReturnType<typeof readCodeGraphyWorkspaceSettingsOrInitial>,
  workspaceRoot: string,
  selection?: ScopeOutputSelection,
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
    complete: selection === undefined,
    nodes: nodeTypes
      .filter(type => selection === undefined || selection.nodeTypes.has(type))
      .map(type => ({
        type,
        enabled: nodeVisibility[type] ?? definitions.get(type)?.defaultVisible ?? false,
        available: availableNodeTypes.has(type),
      })),
    edges: edgeTypes
      .filter(type => selection === undefined || selection.edgeTypes.has(type))
      .map(type => ({
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
  let selection: ScopeOutputSelection | undefined;

  if ((kind === 'node' || kind === 'edge') && typeof type === 'string' && typeof enabled === 'boolean') {
    const updates = kind === 'node'
      ? createNodeVisibilityUpdates(type, enabled)
      : { [type]: enabled };
    patchCodeGraphyWorkspaceSettingRecord(
      workspaceRoot,
      kind === 'node' ? 'nodeVisibility' : 'edgeVisibility',
      updates,
    );
    settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
    selection = {
      nodeTypes: new Set(kind === 'node' ? Object.keys(updates) : []),
      edgeTypes: new Set(kind === 'edge' ? Object.keys(updates) : []),
    };
  }

  return { exitCode: 0, output: createScopeOutput(settings, workspaceRoot, selection) };
}
