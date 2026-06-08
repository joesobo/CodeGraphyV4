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
import { buildPendingFilterPatterns } from './filterPopover';
import { useVisibleGraphStateResponse } from './visibleGraphResponse';
import { ActiveFileBreadcrumb } from '../../components/activeFileBreadcrumb/view';

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
    setFilterPatterns,
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
    coloredData,
    edgeDecorations: graphEdgeDecorations,
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
      {activeFilePath && (
        <div className="flex-shrink-0 border-b border-border px-2 py-1">
          <ActiveFileBreadcrumb filePath={activeFilePath} />
        </div>
      )}
      <div className="flex-1 min-h-0 relative">
        {graphContent}
      </div>
    </div>
  );
}
