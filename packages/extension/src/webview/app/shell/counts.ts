import type { IGraphData } from '../../../shared/graph/contracts';
import { getFilterCountState } from '../../components/searchBar/filters/countState';

interface ShellGraphCountInput {
  countBaseData: IGraphData | null;
  filterVisibleData: IGraphData | null;
  filteredData: IGraphData | null;
  graphData: IGraphData;
  regexError: string | null;
  searchQuery: string;
}

export function getShellGraphCountState({
  countBaseData,
  filterVisibleData,
  filteredData,
  graphData,
  regexError,
  searchQuery,
}: ShellGraphCountInput) {
  const countTotal = countBaseData?.nodes.length ?? graphData.nodes.length;
  const filterVisibleCount = filterVisibleData?.nodes.length ?? countTotal;
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
