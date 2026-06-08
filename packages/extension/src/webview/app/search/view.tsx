import React, { useEffect } from 'react';
import type { SearchOptions } from '../../components/searchBar/field/model';
import { postMessage } from '../../vscodeApi';
import { usePluginManager } from '../../pluginRuntime/useManager';
import { useFilteredGraph } from '../../search/useFilteredGraph';
import { useFilterLegendInputs } from '../shell/derivedState';
import { getShellGraphCountState } from '../shell/counts';
import { useFilterPopoverState } from '../shell/filterPopover';
import { setupMessageListener } from '../shell/messageListener';
import { SearchHeader } from '../shell/panel/search';
import { useAppActions, useAppState } from '../shell/storeSelectors';
import { useShellVisibleGraphs } from '../shell/visibleGraphs';

export default function SearchApp(): React.ReactElement {
  const { pluginHost, injectPluginAssets, resetPluginAssets } = usePluginManager();
  const {
    graphData,
    graphHasIndex,
    searchQuery,
    searchOptions,
    legends,
    filterPatterns,
    pluginFilterPatterns,
    pluginFilterGroups,
    disabledCustomFilterPatterns,
    disabledPluginFilterPatterns,
    showOrphans,
    nodeColors,
    nodeVisibility,
    edgeVisibility,
    graphNodeTypes,
    graphEdgeTypes,
    edgeDecorations,
  } = useAppState();
  const {
    setSearchQuery,
    setSearchOptions,
    setFilterPatterns,
    setDisabledCustomFilterPatterns,
    setDisabledPluginFilterPatterns,
  } = useAppActions();
  const {
    filterPopoverOpen,
    handleFilterPopoverOpenChange,
    pendingFilterPatterns,
  } = useFilterPopoverState();

  useEffect(() => {
    return setupMessageListener(injectPluginAssets, pluginHost, resetPluginAssets);
  }, [injectPluginAssets, pluginHost, resetPluginAssets]);

  const { activeFilterPatterns } = useFilterLegendInputs(
    filterPatterns,
    pluginFilterPatterns,
    disabledCustomFilterPatterns,
    disabledPluginFilterPatterns,
    legends,
  );
  const effectiveShowOrphans = graphHasIndex ? showOrphans : true;
  const { countBaseData, filterVisibleData } = useShellVisibleGraphs({
    activeFilterPatterns,
    edgeVisibility,
    graphData,
    graphEdgeTypes,
    graphNodeTypes,
    nodeVisibility,
    searchOptions,
    showOrphans: effectiveShowOrphans,
  });
  const { filteredData, regexError } = useFilteredGraph(
    graphData,
    searchQuery,
    searchOptions,
    legends,
    nodeColors,
    nodeVisibility,
    edgeVisibility,
    graphEdgeTypes,
    edgeDecorations,
    activeFilterPatterns,
    effectiveShowOrphans,
    graphNodeTypes,
  );

  const { countState, countTotal, excludedCount } = graphData
    ? getShellGraphCountState({
      countBaseData,
      filterVisibleData,
      filteredData,
      graphData,
      regexError,
      searchQuery,
    })
    : {
      countState: { label: null },
      countTotal: 0,
      excludedCount: 0,
    };

  const commitSearchState = (query: string, options: SearchOptions): void => {
    postMessage({
      type: 'UPDATE_SEARCH_STATE',
      payload: { query, options },
    });
  };
  const handleSearchQueryChange = (query: string): void => {
    setSearchQuery(query);
    commitSearchState(query, searchOptions);
  };
  const handleSearchOptionsChange = (options: SearchOptions): void => {
    setSearchOptions(options);
    commitSearchState(searchQuery, options);
  };

  return (
    <div className="min-h-0 w-full overflow-visible">
      <SearchHeader
        searchQuery={searchQuery}
        searchOptions={searchOptions}
        resultCount={filteredData?.nodes.length}
        totalCount={countTotal}
        activeFilePath={null}
        countLabel={countState.label}
        filterPopover={{
          customPatterns: filterPatterns,
          disabledCustomPatterns: disabledCustomFilterPatterns,
          disabledPluginPatterns: disabledPluginFilterPatterns,
          excludedCount,
          onDisabledCustomPatternsChange: setDisabledCustomFilterPatterns,
          onDisabledPluginPatternsChange: setDisabledPluginFilterPatterns,
          onOpenChange: handleFilterPopoverOpenChange,
          onPatternsChange: setFilterPatterns,
          open: filterPopoverOpen,
          pendingPatterns: pendingFilterPatterns,
          pluginGroups: pluginFilterGroups,
          pluginPatterns: pluginFilterPatterns,
        }}
        regexError={regexError}
        onSearchQueryChange={handleSearchQueryChange}
        onSearchOptionsChange={handleSearchOptionsChange}
      />
    </div>
  );
}
