import React, { useEffect, useState } from 'react';
import { useTheme } from '../theme/useTheme';
import { usePluginManager } from '../pluginRuntime/useManager';
import { useFilteredGraph } from '../search/useFilteredGraph';
import { getNoDataHint } from './messages';
import { setupMessageListener } from './messageListener';
import { LoadingState, EmptyState } from './states';
import { useAppState, useAppActions } from './storeSelectors';
import { GraphIndexStatus } from '../components/graphIndexStatus/view';
import { RulePrompt, type RulePromptState } from './RulePrompt';
import { useGraphStore } from '../store/state';
import { GraphSurface } from './GraphSurface';
import { GraphStatsBadge, buildGraphStatsLabel } from './graphStats';
import { PanelStack } from './PanelStack';
import { SearchHeader } from './SearchHeader';
import { ToolbarRail } from './ToolbarRail';
import { useFilterLegendInputs } from './derivedState';
import { useRulePromptHandlers } from './rulePromptHandlers';

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
    showOrphans,
    activePanel,
    depthMode,
    nodeColors,
    nodeVisibility,
    edgeVisibility,
    edgeColors,
    nodeDecorations,
    edgeDecorations,
    activeFilePath,
    graphIsIndexing,
    graphIndexProgress,
  } = useAppState();
  const { setSearchQuery, setSearchOptions, setActivePanel } = useAppActions();
  const setFilterPatterns = useGraphStore((state) => state.setFilterPatterns);
  const setOptimisticUserLegends = useGraphStore((state) => state.setOptimisticUserLegends);
  const [rulePrompt, setRulePrompt] = useState<RulePromptState | null>(null);

  const theme = useTheme();
  const { activeFilterPatterns, userLegendRules } = useFilterLegendInputs(
    filterPatterns,
    pluginFilterPatterns,
    legends,
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
    edgeColors,
    edgeDecorations,
    activeFilterPatterns,
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
    return setupMessageListener(injectPluginAssets, pluginHost);
  }, [injectPluginAssets, pluginHost]);

  if (isLoading) return <LoadingState />;

  if (!graphData) {
    return <EmptyState hint={getNoDataHint(graphData, showOrphans, depthMode)} />;
  }

  const displayGraphData = coloredData || graphData;
  const graphStatsLabel = buildGraphStatsLabel(displayGraphData.nodes.length, displayGraphData.edges.length);
  const closeActivePanel = () => setActivePanel('none');

  return (
    <div className="relative w-full h-screen flex flex-col">
      <SearchHeader
        searchQuery={searchQuery}
        searchOptions={searchOptions}
        resultCount={filteredData?.nodes.length}
        totalCount={graphData.nodes.length}
        activeFilePath={activeFilePath}
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
          theme={theme}
          nodeDecorations={nodeDecorations}
          edgeDecorations={graphEdgeDecorations}
          pluginHost={pluginHost}
          onAddFilterRequested={openFilterPrompt}
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
