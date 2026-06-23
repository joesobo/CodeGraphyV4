import type { SearchOptions } from '../../components/searchBar/field/model';
import type {
  IGraphEdgeTypeDefinition,
  IGraphNodeTypeDefinition,
} from '../../../shared/graphControls/contracts';
import type { IGroup } from '../../../shared/settings/groups';

function sortedRecordEntries<TValue>(record: Record<string, TValue>): [string, TValue][] {
  return Object.entries(record).sort(([left], [right]) => left.localeCompare(right));
}

export function createStyledGraphCacheKey({
  edgeTypes,
  nodeColors,
}: {
  edgeTypes: IGraphEdgeTypeDefinition[];
  nodeColors: Record<string, string>;
}): string {
  return JSON.stringify({
    edgeTypes: edgeTypes.map(({ defaultColor, id }) => [id, defaultColor]),
    nodeColors: sortedRecordEntries(nodeColors),
  });
}

export function createLegendGraphCacheKey(legends: IGroup[]): string {
  return JSON.stringify(legends);
}

export function createVisibleGraphCacheKey({
  edgeTypes,
  edgeVisibility,
  filterPatterns,
  nodeTypes,
  nodeVisibility,
  searchOptions,
  searchQuery,
  showOrphans,
}: {
  edgeTypes: IGraphEdgeTypeDefinition[];
  edgeVisibility: Record<string, boolean>;
  filterPatterns: readonly string[];
  nodeTypes: IGraphNodeTypeDefinition[];
  nodeVisibility: Record<string, boolean>;
  searchOptions: SearchOptions;
  searchQuery: string;
  showOrphans: boolean;
}): string {
  return JSON.stringify({
    edgeTypes: edgeTypes.map(({ defaultVisible, id }) => [id, defaultVisible]),
    edgeVisibility: sortedRecordEntries(edgeVisibility),
    filterPatterns,
    nodeTypes: nodeTypes.map(({ defaultVisible, id }) => [id, defaultVisible]),
    nodeVisibility: sortedRecordEntries(nodeVisibility),
    searchOptions,
    searchQuery,
    showOrphans,
  });
}
