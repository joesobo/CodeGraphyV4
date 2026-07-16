import React, { useEffect, useState } from 'react';
import { useTheme } from '../../theme/useTheme';
import { usePluginManager } from '../../pluginRuntime/useManager';
import { useFilteredGraph } from '../../search/useFilteredGraph';
import { getNoDataHint } from './messages';
import { setupMessageListener } from './messageListener';
import { EmptyState } from './states';
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
import { getShellGraphCountState } from './counts';
import { useFilterPopoverState } from './filterPopover';
import { useVisibleGraphStateResponse } from './visibleGraphResponse';
import { useShellVisibleGraphs } from './visibleGraphs';
import { useDebouncedGraphScopeVisibility } from './graphScopeVisibility';
import { renderGraphStartupState, useGraphPhysicsPreparation } from './physicsPreparation';

export interface AppShellProps {
  graphPhysicsPreparation?: Promise<void>;
}

export default function App({ graphPhysicsPreparation }: AppShellProps): React.ReactElement {
  const graphPhysics = useGraphPhysicsPreparation(graphPhysicsPreparation);
  const { pluginHost, injectPluginAssets, resetPluginAssets, updatePluginData } = usePluginManager();
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
    setSearchQuery,
    setSearchOptions,
    setActivePanel,
    setFilterPatterns,
    setDisabledCustomFilterPatterns,
    setDisabledPluginFilterPatterns,
  } = useAppActions();
  const setOptimisticUserLegends = useGraphStore((state) => state.setOptimisticUserLegends);
  const showMinimap = useGraphStore((state) => state.showMinimap);
  const [rulePrompt, setRulePrompt] = useState<RulePromptState | null>(null);
  const {
    filterPopoverOpen,
    handleFilterPopoverOpenChange,
    openFilterPopoverWithPatterns,
    pendingFilterPatterns,
  } = useFilterPopoverState();

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
    edgeVisibility: renderEdgeVisibility,
    nodeVisibility: renderNodeVisibility,
  } = useDebouncedGraphScopeVisibility(nodeVisibility, edgeVisibility);
  const visibleGraphInput = isLoading ? null : graphData;
  const {
    filteredData,
    coloredData,
    edgeDecorations: graphEdgeDecorations,
    regexError,
  } = useFilteredGraph(
    visibleGraphInput,
    searchQuery,
    searchOptions,
    legends,
    nodeColors,
    renderNodeVisibility,
    renderEdgeVisibility,
    graphEdgeTypes,
    edgeDecorations,
    activeFilterPatterns,
    effectiveShowOrphans,
    graphNodeTypes,
  );
  const { countBaseData, filterVisibleData } = useShellVisibleGraphs({
    activeFilterPatterns,
    edgeVisibility: renderEdgeVisibility,
    filteredData,
    graphData: visibleGraphInput,
    graphEdgeTypes,
    graphNodeTypes,
    nodeVisibility: renderNodeVisibility,
    searchOptions,
    searchQuery,
    showOrphans: effectiveShowOrphans,
  });

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
    return setupMessageListener(injectPluginAssets, pluginHost, resetPluginAssets, updatePluginData);
  }, [injectPluginAssets, pluginHost, resetPluginAssets, updatePluginData]);

  const displayGraphData = coloredData || visibleGraphInput;
  useVisibleGraphStateResponse(displayGraphData);

  const startupState = renderGraphStartupState(graphPhysics, isLoading);
  if (startupState) return startupState;

  if (!graphData) {
    return <EmptyState hint={getNoDataHint(graphData, showOrphans, depthMode)} />;
  }

  const loadedDisplayGraphData = displayGraphData ?? graphData;
  const graphStatsLabel = buildGraphStatsLabel(
    loadedDisplayGraphData.nodes.length,
    loadedDisplayGraphData.edges.length,
  );
  const closeActivePanel = () => setActivePanel('none');
  const { countState, countTotal, excludedCount } = getShellGraphCountState({
    countBaseData,
    filterVisibleData,
    filteredData,
    graphData,
    regexError,
    searchQuery,
  });

  return (
    <main
      className="relative w-full h-screen flex flex-col"
      data-codegraphy-surface="app"
    >
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
      <section
        className="flex-1 min-h-0 relative"
        data-codegraphy-surface="graph-view"
      >
        <GraphSurface
          graphData={graphData}
          coloredData={coloredData}
          showOrphans={effectiveShowOrphans}
          depthMode={depthMode}
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
        <GraphIndexStatus
          isIndexing={graphIsIndexing}
          progress={graphIndexProgress}
          showMinimap={showMinimap}
        />
        <RulePrompt
          state={rulePrompt}
          onClose={closeRulePrompt}
          onSubmit={handleRulePromptSubmit}
        />
      </section>
    </main>
  );
}
