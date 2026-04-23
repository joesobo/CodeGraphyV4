import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../theme/useTheme';
import { usePluginManager } from '../../pluginRuntime/useManager';
import { useFilteredGraph } from '../../search/useFilteredGraph';
import { getNoDataHint } from './messages';
import { setupMessageListener } from './messageListener';
import { LoadingState, EmptyState } from './states';
import { useAppState, useAppActions } from './storeSelectors';
import { GraphIndexStatus } from '../../components/graphIndexStatus/view';
import { RulePrompt, type RulePromptState } from '../rulePrompt/view';
import { useGraphStore } from '../../store/state';
import { GraphSurface } from '../graph/surface';
import { GraphStatsBadge, buildGraphStatsLabel } from '../graph/stats';
import { PanelStack } from './panel/stack';
import { SearchHeader } from './panel/search';
import { ToolbarRail } from './panel/toolbar';
import { useFilterLegendInputs } from './derivedState';
import { useRulePromptHandlers } from '../rulePrompt/handlers';
import { applyFilterPatterns } from '../../search/filtering/patterns';
import { getFilterCountState } from '../../components/searchBar/filters/countState';
import { toFilterGlob } from '../../components/searchBar/filters/model';

export default function App(): React.ReactElement {
  const { pluginHost, injectPluginAssets } = usePluginManager();
  const {
    graphData,
    isLoading,
    searchQuery,
    searchOptions,
    legends,
    filterPatterns,
    pluginFilterPatterns,
    pluginFilterGroups,
    disabledCustomFilterPatterns,
    disabledPluginFilterPatterns,
    showOrphans,
    timelineActive,
    activePanel,
    depthMode,
    nodeColors,
    nodeVisibility,
    edgeVisibility,
    graphEdgeTypes,
    nodeDecorations,
    edgeDecorations,
    activeFilePath,
    graphIsIndexing,
    graphIndexProgress,
  } = useAppState();
  const {
    setSearchQuery,
    setSearchOptions,
    setActivePanel,
    setFilterPatterns,
    setDisabledCustomFilterPatterns,
    setDisabledPluginFilterPatterns,
  } = useAppActions();
  const setOptimisticUserLegends = useGraphStore((state) => state.setOptimisticUserLegends);
  const [rulePrompt, setRulePrompt] = useState<RulePromptState | null>(null);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [pendingFilterPatterns, setPendingFilterPatterns] = useState<string[]>([]);

  const theme = useTheme();
  const { activeFilterPatterns, userLegendRules } = useFilterLegendInputs(
    filterPatterns,
    pluginFilterPatterns,
    disabledCustomFilterPatterns,
    disabledPluginFilterPatterns,
    legends,
  );
  const filterVisibleData = useMemo(
    () => applyFilterPatterns(graphData, activeFilterPatterns),
    [activeFilterPatterns, graphData],
  );
  const {
    filteredData,
    coloredData,
    edgeDecorations: graphEdgeDecorations,
    regexError,
  } = useFilteredGraph(
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
  );

  const {
    closeRulePrompt,
    openLegendPrompt,
    handleRulePromptSubmit,
  } = useRulePromptHandlers({
    filterPatterns,
    userLegendRules,
    setFilterPatterns,
    setOptimisticUserLegends,
    setRulePrompt,
  });

  useEffect(() => {
    return setupMessageListener(injectPluginAssets, pluginHost);
  }, [injectPluginAssets, pluginHost]);

  if (isLoading) return <LoadingState />;

  if (!graphData) {
    return <EmptyState hint={getNoDataHint(graphData, showOrphans, depthMode, timelineActive)} />;
  }

  const displayGraphData = coloredData || graphData;
  const graphStatsLabel = buildGraphStatsLabel(displayGraphData.nodes.length, displayGraphData.edges.length);
  const closeActivePanel = () => setActivePanel('none');
  const excludedCount = graphData.nodes.length - (filterVisibleData?.nodes.length ?? graphData.nodes.length);
  const countState = getFilterCountState({
    excludedCount,
    filterVisibleCount: filterVisibleData?.nodes.length ?? graphData.nodes.length,
    regexError,
    resultCount: filteredData?.nodes.length,
    searchActive: searchQuery.length > 0,
    totalCount: graphData.nodes.length,
  });
  const openFilterPopoverWithPatterns = (patterns: string[]) => {
    setPendingFilterPatterns(patterns.map(toFilterGlob).filter(Boolean));
    setFilterPopoverOpen(true);
  };

  return (
    <div className="relative w-full h-screen flex flex-col">
      <SearchHeader
        searchQuery={searchQuery}
        searchOptions={searchOptions}
        resultCount={filteredData?.nodes.length}
        totalCount={graphData.nodes.length}
        activeFilePath={activeFilePath}
        countLabel={countState.label}
        filterPopover={{
          customPatterns: filterPatterns,
          disabledCustomPatterns: disabledCustomFilterPatterns,
          disabledPluginPatterns: disabledPluginFilterPatterns,
          excludedCount,
          onDisabledCustomPatternsChange: setDisabledCustomFilterPatterns,
          onDisabledPluginPatternsChange: setDisabledPluginFilterPatterns,
          onOpenChange: (open) => {
            setFilterPopoverOpen(open);
            if (!open) {
              setPendingFilterPatterns([]);
            }
          },
          onPatternsChange: setFilterPatterns,
          open: filterPopoverOpen,
          pendingPatterns: pendingFilterPatterns,
          pluginGroups: pluginFilterGroups,
          pluginPatterns: pluginFilterPatterns,
        }}
        regexError={regexError}
        onSearchQueryChange={setSearchQuery}
        onSearchOptionsChange={setSearchOptions}
      />
      <div className="flex-1 min-h-0 relative">
        <GraphSurface
          graphData={graphData}
          coloredData={coloredData}
          showOrphans={showOrphans}
          depthMode={depthMode}
          timelineActive={timelineActive}
          theme={theme}
          nodeDecorations={nodeDecorations}
          edgeDecorations={graphEdgeDecorations}
          pluginHost={pluginHost}
          onAddFilterRequested={openFilterPopoverWithPatterns}
          onAddLegendRequested={openLegendPrompt}
        />
        <GraphStatsBadge label={graphStatsLabel} />
        <ToolbarRail pluginHost={pluginHost} />
        <PanelStack
          activePanel={activePanel}
          hasGraphNodes={Boolean(graphData.nodes.length)}
          pluginHost={pluginHost}
          onClosePanel={closeActivePanel}
        />
        <GraphIndexStatus isIndexing={graphIsIndexing} progress={graphIndexProgress} />
        <RulePrompt
          state={rulePrompt}
          onClose={closeRulePrompt}
          onSubmit={handleRulePromptSubmit}
        />
      </div>
    </div>
  );
}
