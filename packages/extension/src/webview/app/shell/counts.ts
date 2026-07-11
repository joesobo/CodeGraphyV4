import type { IGraphData } from '../../../shared/graph/contracts';
import { getFilterCountState } from '../../components/searchBar/filters/countState';

interface ShellGraphCountInput {
  countBaseData: IGraphData | null;
  filterVisibleData: IGraphData | null;
  filteredData: IGraphData | null;
  filesExcludedCount?: number;
  graphData: IGraphData;
  regexError: string | null;
  searchQuery: string;
}

export function getShellGraphCountState({
  countBaseData,
  filterVisibleData,
  filteredData,
  filesExcludedCount = 0,
  graphData,
  regexError,
  searchQuery,
}: ShellGraphCountInput) {
  const visibleBaseTotal = countBaseData?.nodes.length ?? graphData.nodes.length;
  const countTotal = visibleBaseTotal + filesExcludedCount;
  const filterVisibleCount = filterVisibleData?.nodes.length ?? visibleBaseTotal;
  const excludedCount = Math.max(0, countTotal - filterVisibleCount);
  const countState = getFilterCountState({
    excludedCount,
    filterVisibleCount,
    regexError,
    resultCount: filteredData?.nodes.length,
    searchActive: searchQuery.length > 0,
    totalCount: countTotal,
  });

  return {
    countState,
    countTotal,
    excludedCount,
    filterVisibleCount,
  };
}
