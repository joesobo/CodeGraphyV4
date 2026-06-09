import React, { useEffect, useState } from 'react';
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
import { ToolbarRail } from './panel/toolbar';
import { useFilterLegendInputs } from './derivedState';
import { useRulePromptHandlers } from '../rulePrompt/handlers';
import { buildPendingFilterPatterns, useFilterPopoverState } from './filterPopover';
import { useVisibleGraphStateResponse } from './visibleGraphResponse';
import { SearchHeader } from './panel/search';
import { useShellVisibleGraphs } from './visibleGraphs';
import { getShellGraphCountState } from './counts';

export default function App(): React.ReactElement {
  const { pluginHost, injectPluginAssets, resetPluginAssets } = usePluginManager();
  const {
    graphData,
    isLoading,
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
    timelineActive,
    activePanel,
    depthMode,
    nodeColors,
    nodeVisibility,
    edgeVisibility,
    graphNodeTypes,
    graphEdgeTypes,
    nodeDecorations,
    edgeDecorations,
    activeFilePath,
    graphIsIndexing,
    graphIndexProgress,
  } = useAppState();
  const {
    setActivePanel,
    setSearchQuery,
    setSearchOptions,
    setFilterPatterns,
    setDisabledCustomFilterPatterns,
    setDisabledPluginFilterPatterns,
  } = useAppActions();
  const setOptimisticUserLegends = useGraphStore((state) => state.setOptimisticUserLegends);
  const [rulePrompt, setRulePrompt] = useState<RulePromptState | null>(null);

  const theme = useTheme();
  const { activeFilterPatterns, userLegendRules } = useFilterLegendInputs(
    filterPatterns,
    pluginFilterPatterns,
    disabledCustomFilterPatterns,
    disabledPluginFilterPatterns,
    legends,
  );
  const effectiveShowOrphans = graphHasIndex ? showOrphans : true;
  const {
    filterPopoverOpen,
    handleFilterPopoverOpenChange,
    pendingFilterPatterns,
  } = useFilterPopoverState();
  const {
    coloredData,
    filteredData,
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
    effectiveShowOrphans,
    graphNodeTypes,
  );

  const {
    closeRulePrompt,
    openFilterPrompt,
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
    return setupMessageListener(injectPluginAssets, pluginHost, resetPluginAssets);
  }, [injectPluginAssets, pluginHost, resetPluginAssets]);

  const displayGraphData = coloredData || graphData;
  useVisibleGraphStateResponse(displayGraphData);
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

  const closeActivePanel = () => setActivePanel('none');
  const openFilterPromptWithPatterns = (patterns: string[]) => {
    const [pattern] = buildPendingFilterPatterns(patterns);
    if (pattern) {
      openFilterPrompt(pattern);
    }
  };
  const graphContent = (() => {
    if (isLoading) {
      return <LoadingState fullScreen={false} />;
    }

    if (!graphData) {
      return <EmptyState fullScreen={false} hint={getNoDataHint(graphData, showOrphans, depthMode, timelineActive)} />;
    }

    const loadedDisplayGraphData = displayGraphData ?? graphData;
    const graphStatsLabel = buildGraphStatsLabel(
      loadedDisplayGraphData.nodes.length,
      loadedDisplayGraphData.edges.length,
    );

    return (
      <>
        <GraphSurface
          graphData={graphData}
          coloredData={coloredData}
          showOrphans={effectiveShowOrphans}
          depthMode={depthMode}
          timelineActive={timelineActive}
          theme={theme}
          nodeDecorations={nodeDecorations}
          edgeDecorations={graphEdgeDecorations}
          pluginHost={pluginHost}
          onAddFilterRequested={openFilterPromptWithPatterns}
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
      </>
    );
  })();

  return (
    <div className="relative w-full h-screen flex flex-col">
      <SearchHeader
        searchQuery={searchQuery}
        searchOptions={searchOptions}
        resultCount={filteredData?.nodes.length}
        totalCount={countTotal}
        activeFilePath={activeFilePath}
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
        onSearchQueryChange={setSearchQuery}
        onSearchOptionsChange={setSearchOptions}
      />
      <div className="flex-1 min-h-0 relative">
        {graphContent}
      </div>
    </div>
  );
}
