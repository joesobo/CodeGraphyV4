import type { SearchOptions } from '../../components/searchBar/field/model';
import { deriveVisibleGraph } from '../../../shared/visibleGraph';
import type { VisibleGraphResult } from '../../../shared/visibleGraph';
import type { IGraphData } from '../../../shared/graph/contracts';
import type {
  IGraphEdgeTypeDefinition,
  IGraphNodeTypeDefinition,
} from '../../../shared/graphControls/contracts';
import { buildVisibleGraphConfig } from '../visibleGraphConfig';
import { cacheVisibleGraphResult } from './visibleCache';
import type { VisibleGraphCache } from './visibleCache';

export function getVisibleGraphResult({
  cache,
  edgeTypes,
  edgeVisibility,
  filterPatterns,
  graphData,
  key,
  nodeTypes,
  nodeVisibility,
  searchOptions,
  searchQuery,
  showOrphans,
}: {
  cache: VisibleGraphCache;
  edgeTypes: IGraphEdgeTypeDefinition[];
  edgeVisibility: Record<string, boolean>;
  filterPatterns: readonly string[];
  graphData: IGraphData | null;
  key: string;
  nodeTypes: IGraphNodeTypeDefinition[];
  nodeVisibility: Record<string, boolean>;
  searchOptions: SearchOptions;
  searchQuery: string;
  showOrphans: boolean;
}): VisibleGraphResult {
  if (cache.graphData !== graphData) {
    cache.graphData = graphData;
    cache.entries.clear();
  }

  const cached = cache.entries.get(key);
  if (cached) {
    cache.entries.delete(key);
    cache.entries.set(key, cached);
    return cached;
  }

  const result = deriveVisibleGraph(graphData, buildVisibleGraphConfig({
    edgeTypes,
    edgeVisibility,
    filterPatterns,
    nodeTypes,
    nodeVisibility,
    searchOptions,
    searchQuery,
    showOrphans,
  }));
  cacheVisibleGraphResult(cache, key, result);
  return result;
}
