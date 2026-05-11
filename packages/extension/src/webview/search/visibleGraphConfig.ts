import type { SearchOptions } from '../components/searchBar/field/model';
import type { IGraphEdgeTypeDefinition } from '../../shared/graphControls/contracts';
import type {
  VisibleGraphCollapseConfig,
  VisibleGraphConfig,
  VisibleGraphFilterConfig,
  VisibleGraphScopeConfig,
  VisibleGraphSearchConfig,
} from '../../shared/visibleGraph';
import type { GraphLayoutSettings } from '../../shared/settings/graphLayout';
import { getCollapsedGraphNodeIds } from '../../shared/settings/graphLayout';

const LEGACY_NESTS_EDGE_TYPE = 'codegraphy:nests';
const SHARED_NESTS_EDGE_TYPE = 'nests';

export function toSharedEdgeType(type: string): string {
  return type === LEGACY_NESTS_EDGE_TYPE ? SHARED_NESTS_EDGE_TYPE : type;
}

export function withSharedEdgeTypeAliases(
  edgeTypes: IGraphEdgeTypeDefinition[],
): IGraphEdgeTypeDefinition[] {
  return edgeTypes.flatMap((edgeType) => (
    edgeType.id === LEGACY_NESTS_EDGE_TYPE
      ? [
          edgeType,
          {
            ...edgeType,
            id: SHARED_NESTS_EDGE_TYPE as IGraphEdgeTypeDefinition['id'],
          },
        ]
      : [edgeType]
  ));
}

export function buildVisibleGraphScopeConfig(
  nodeVisibility: Record<string, boolean> = {},
  edgeVisibility: Record<string, boolean> = {},
  edgeTypes: IGraphEdgeTypeDefinition[] = [],
): VisibleGraphScopeConfig {
  const edgeScopes = new Map<string, boolean>();

  for (const edgeType of edgeTypes) {
    edgeScopes.set(
      toSharedEdgeType(edgeType.id),
      edgeVisibility[edgeType.id] ?? edgeType.defaultVisible,
    );
  }

  for (const [type, enabled] of Object.entries(edgeVisibility)) {
    edgeScopes.set(toSharedEdgeType(type), enabled);
  }

  return {
    nodes: Object.entries(nodeVisibility).map(([type, enabled]) => ({ type, enabled })),
    edges: Array.from(edgeScopes, ([type, enabled]) => ({ type, enabled })),
  };
}

export function buildVisibleGraphFilterConfig(
  filterPatterns: readonly string[] = [],
): VisibleGraphFilterConfig | undefined {
  return filterPatterns.length > 0 ? { patterns: filterPatterns } : undefined;
}

export function buildVisibleGraphSearchConfig(
  searchQuery: string,
  searchOptions: SearchOptions,
): VisibleGraphSearchConfig | undefined {
  return searchQuery.trim().length > 0
    ? { query: searchQuery, options: searchOptions }
    : undefined;
}

export function buildVisibleGraphCollapseConfig(
  graphLayout?: GraphLayoutSettings,
): VisibleGraphCollapseConfig | undefined {
  if (!graphLayout) {
    return undefined;
  }

  const collapsedNodeIds = getCollapsedGraphNodeIds(graphLayout);
  return collapsedNodeIds.length > 0 ? { collapsedNodeIds } : undefined;
}

export function buildVisibleGraphConfig({
  edgeTypes,
  edgeVisibility,
  filterPatterns,
  graphLayout,
  nodeVisibility,
  searchOptions,
  searchQuery,
  showOrphans,
}: {
  edgeTypes?: IGraphEdgeTypeDefinition[];
  edgeVisibility?: Record<string, boolean>;
  filterPatterns?: readonly string[];
  graphLayout?: GraphLayoutSettings;
  nodeVisibility?: Record<string, boolean>;
  searchOptions: SearchOptions;
  searchQuery: string;
  showOrphans: boolean;
}): VisibleGraphConfig {
  return {
    scope: buildVisibleGraphScopeConfig(nodeVisibility, edgeVisibility, edgeTypes),
    filter: buildVisibleGraphFilterConfig(filterPatterns),
    search: buildVisibleGraphSearchConfig(searchQuery, searchOptions),
    collapse: buildVisibleGraphCollapseConfig(graphLayout),
    showOrphans,
  };
}
