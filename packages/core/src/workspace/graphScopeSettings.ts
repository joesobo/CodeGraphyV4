import { CORE_GRAPH_NODE_TYPES } from '../graphControls/defaults/definitions';
import type { IGraphData } from '../graph/contracts';
import type { CodeGraphyWorkspaceSettings } from './settingsContracts';

export const CORE_GRAPH_EDGE_TYPES = [
  'call',
  'contains',
  'event',
  'implements',
  'import',
  'include',
  'inherit',
  'load',
  'nests',
  'overrides',
  'reference',
  'type',
  'type-import',
  'using',
  'codegraphy.gdscript:signal-connection',
] as const;

export const CORE_GRAPH_EDGE_DEFAULT_VISIBILITY: Record<string, boolean> = {
  include: true,
  import: true,
  using: true,
  nests: true,
  call: false,
  contains: false,
  event: false,
  implements: false,
  inherit: false,
  load: false,
  overrides: false,
  reference: false,
  type: false,
  'type-import': false,
  'codegraphy.gdscript:signal-connection': false,
};

const NODE_DEFINITION_BY_ID = new Map(CORE_GRAPH_NODE_TYPES.map(definition => [definition.id, definition]));

export interface ResolvedGraphScopeSettings {
  nodes: Record<string, boolean>;
  edges: Record<string, boolean>;
}

export interface GraphScopeDefaultDeclarations {
  nodes?: readonly { id: string; defaultVisible: boolean }[];
  edges?: readonly { id: string; defaultVisible: boolean }[];
}

function enableNodeParents(nodes: Record<string, boolean>, explicitTypes: ReadonlySet<string>): void {
  for (const [type, enabled] of Object.entries(nodes)) {
    if (!enabled) continue;
    let parentId = NODE_DEFINITION_BY_ID.get(type)?.parentId;
    while (parentId) {
      if (!explicitTypes.has(parentId)) nodes[parentId] = true;
      parentId = NODE_DEFINITION_BY_ID.get(parentId)?.parentId;
    }
  }
}

function hasPluginSpecificMatcher(definition: typeof CORE_GRAPH_NODE_TYPES[number]): boolean {
  return Boolean(
    definition.matchSymbolPluginKind
    || definition.matchSymbolSource
    || definition.matchSymbolLanguage
    || definition.matchSymbolFilePath,
  );
}

function enableOverlappingCoreSymbolRows(
  nodes: Record<string, boolean>,
  explicitTypes: ReadonlySet<string>,
): void {
  const enabledKinds = new Set(
    CORE_GRAPH_NODE_TYPES
      .filter(definition => nodes[definition.id] === true && !hasPluginSpecificMatcher(definition))
      .flatMap(definition => definition.matchSymbolKinds ?? []),
  );
  for (const definition of CORE_GRAPH_NODE_TYPES) {
    if (hasPluginSpecificMatcher(definition)) continue;
    if (
      !explicitTypes.has(definition.id)
      && definition.matchSymbolKinds?.some(kind => enabledKinds.has(kind))
    ) nodes[definition.id] = true;
  }
}

export function resolveSavedGraphScope(
  settings: Pick<CodeGraphyWorkspaceSettings, 'edgeVisibility' | 'nodeVisibility'>,
  graphData?: IGraphData,
  declarations: GraphScopeDefaultDeclarations = {},
): ResolvedGraphScopeSettings {
  const nodes: Record<string, boolean> = Object.fromEntries(
    CORE_GRAPH_NODE_TYPES.map(definition => [definition.id, definition.defaultVisible]),
  );
  const edges: Record<string, boolean> = { ...CORE_GRAPH_EDGE_DEFAULT_VISIBILITY };
  const explicitNodeTypes = new Set(Object.keys(settings.nodeVisibility ?? {}));
  for (const definition of declarations.nodes ?? []) nodes[definition.id] = definition.defaultVisible;
  for (const definition of declarations.edges ?? []) edges[definition.id] = definition.defaultVisible;
  for (const node of graphData?.nodes ?? []) nodes[node.nodeType ?? 'file'] ??= node.nodeType === undefined;
  for (const edge of graphData?.edges ?? []) edges[edge.kind] ??= true;
  Object.assign(nodes, settings.nodeVisibility ?? {});
  Object.assign(edges, settings.edgeVisibility ?? {});
  enableOverlappingCoreSymbolRows(nodes, explicitNodeTypes);
  enableNodeParents(nodes, explicitNodeTypes);
  return { nodes, edges };
}
