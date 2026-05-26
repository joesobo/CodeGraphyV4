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
import { deriveVisibleGraph } from '../../../shared/visibleGraph';
import { getFilterCountState } from '../../components/searchBar/filters/countState';
import { toFilterGlob } from '../../components/searchBar/filters/model';
import { buildVisibleGraphConfig } from '../../search/visibleGraphConfig';
import { postMessage as postWebviewMessage } from '../../vscodeApi';

type AppShellState = ReturnType<typeof useAppState>;
type AppShellActions = ReturnType<typeof useAppActions>;
type LoadedGraphData = NonNullable<AppShellState['graphData']>;
type PluginRuntime = ReturnType<typeof usePluginManager>;
type ThemeState = ReturnType<typeof useTheme>;

const EMPTY_FILTER_PATTERNS: string[] = [];

function useScopedVisibleGraphData(
  graphData: LoadedGraphData,
  state: AppShellState,
  filterPatterns: string[],
): LoadedGraphData | null {
  const {
    edgeVisibility,
    graphEdgeTypes,
    graphLayout,
    nodeVisibility,
    searchOptions,
    showOrphans,
  } = state;

  return useMemo(
    () => deriveVisibleGraph(graphData, buildVisibleGraphConfig({
      edgeTypes: graphEdgeTypes,
      edgeVisibility,
      filterPatterns,
      graphLayout,
      nodeVisibility,
      searchOptions,
      searchQuery: '',
      showOrphans,
    })).graphData,
    [edgeVisibility, filterPatterns, graphData, graphEdgeTypes, graphLayout, nodeVisibility, searchOptions, showOrphans],
  );
}

function useLoadedGraphData(
  graphData: LoadedGraphData,
  state: AppShellState,
  activeFilterPatterns: string[],
) {
  const countBaseData = useScopedVisibleGraphData(graphData, state, EMPTY_FILTER_PATTERNS);
  const filterVisibleData = useScopedVisibleGraphData(graphData, state, activeFilterPatterns);

  const {
    edgeDecorations,
    edgeVisibility,
    graphEdgeTypes,
    graphLayout,
    legends,
    nodeColors,
    nodeVisibility,
    searchOptions,
    searchQuery,
    showOrphans,
  } = state;
  const filteredGraph = useFilteredGraph(
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
    showOrphans,
    graphLayout,
  );

  return {
    countBaseData,
    filterVisibleData,
    ...filteredGraph,
  };
}

function getLoadedGraphCountState({
  countBaseData,
  filterVisibleData,
  filteredData,
  graphData,
  regexError,
  searchQuery,
}: {
  countBaseData: LoadedGraphData | null;
  filterVisibleData: LoadedGraphData | null;
  filteredData: LoadedGraphData | null;
  graphData: LoadedGraphData;
  regexError: string | null;
  searchQuery: string;
}) {
  const countTotal = countBaseData?.nodes.length ?? graphData.nodes.length;
  const filterVisibleCount = filterVisibleData?.nodes.length ?? countTotal;
  const excludedCount = Math.max(0, countTotal - filterVisibleCount);

  return {
    countState: getFilterCountState({
      excludedCount,
      filterVisibleCount,
      regexError,
      resultCount: filteredData?.nodes.length,
      searchActive: searchQuery.length > 0,
      totalCount: countTotal,
    }),
    countTotal,
    excludedCount,
  };
}

function useFilterPopoverControls() {
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [pendingFilterPatterns, setPendingFilterPatterns] = useState<string[]>([]);

  const openFilterPopoverWithPatterns = (patterns: string[]) => {
    setPendingFilterPatterns(patterns.map(toFilterGlob).filter(Boolean));
    setFilterPopoverOpen(true);
  };

  const handleFilterPopoverOpenChange = (open: boolean) => {
    setFilterPopoverOpen(open);
    if (!open) {
      setPendingFilterPatterns([]);
    }
  };

  return {
    filterPopoverOpen,
    handleFilterPopoverOpenChange,
    openFilterPopoverWithPatterns,
    pendingFilterPatterns,
  };
}

function useVisibleGraphStateResponder(displayGraphData: LoadedGraphData | null): void {
  useEffect(() => {
    const handleVisibleGraphStateRequest = (event: MessageEvent<unknown>) => {
      const raw = event.data as { type?: unknown };
      if (!raw || raw.type !== 'GET_VISIBLE_GRAPH_STATE') {
        return;
      }

      postWebviewMessage({
        type: 'VISIBLE_GRAPH_STATE_RESPONSE',
        payload: {
          nodeCount: displayGraphData?.nodes.length ?? 0,
          edgeCount: displayGraphData?.edges.length ?? 0,
          edgeIds: displayGraphData?.edges.map(edge => edge.id) ?? [],
        },
      });
    };

    window.addEventListener('message', handleVisibleGraphStateRequest);
    return () => window.removeEventListener('message', handleVisibleGraphStateRequest);
  }, [displayGraphData]);
}

interface LoadedAppProps {
  actions: AppShellActions;
  graphData: LoadedGraphData;
  pluginRuntime: PluginRuntime;
  state: AppShellState;
  theme: ThemeState;
}

function LoadedApp({
  actions,
  graphData,
  pluginRuntime,
  state,
  theme,
}: LoadedAppProps): React.ReactElement {
  const {
    activeFilePath,
    activePanel,
    depthMode,
    disabledCustomFilterPatterns,
    disabledPluginFilterPatterns,
    filterPatterns,
    graphIndexProgress,
    graphIsIndexing,
    legends,
    nodeDecorations,
    pluginFilterGroups,
    pluginFilterPatterns,
    searchOptions,
    searchQuery,
    showOrphans,
    timelineActive,
  } = state;
  const {
    setActivePanel,
    setDisabledCustomFilterPatterns,
    setDisabledPluginFilterPatterns,
    setFilterPatterns,
    setSearchOptions,
    setSearchQuery,
  } = actions;
  const { pluginHost } = pluginRuntime;
  const setOptimisticUserLegends = useGraphStore((store) => store.setOptimisticUserLegends);
  const [rulePrompt, setRulePrompt] = useState<RulePromptState | null>(null);
  const {
    filterPopoverOpen,
    handleFilterPopoverOpenChange,
    openFilterPopoverWithPatterns,
    pendingFilterPatterns,
  } = useFilterPopoverControls();
  const { activeFilterPatterns, userLegendRules } = useFilterLegendInputs(
    filterPatterns,
    pluginFilterPatterns,
    disabledCustomFilterPatterns,
    disabledPluginFilterPatterns,
    legends,
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
  const {
    coloredData,
    countBaseData,
    edgeDecorations: graphEdgeDecorations,
    filteredData,
    filterVisibleData,
    regexError,
  } = useLoadedGraphData(graphData, state, activeFilterPatterns);
  const displayGraphData = coloredData || graphData;
  const graphStatsLabel = buildGraphStatsLabel(
    displayGraphData.nodes.length,
    displayGraphData.edges.length,
  );
  const { countState, countTotal, excludedCount } = getLoadedGraphCountState({
    countBaseData,
    filterVisibleData,
    filteredData,
    graphData,
    regexError,
    searchQuery,
  });

  useVisibleGraphStateResponder(displayGraphData);

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
          onClosePanel={() => setActivePanel('none')}
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

export default function App(): React.ReactElement {
  const pluginRuntime = usePluginManager();
  const appState = useAppState();
  const appActions = useAppActions();
  const theme = useTheme();

  useEffect(() => {
    return setupMessageListener(pluginRuntime.injectPluginAssets, pluginRuntime.pluginHost);
  }, [pluginRuntime.injectPluginAssets, pluginRuntime.pluginHost]);

  if (appState.isLoading) return <LoadingState />;

  if (!appState.graphData) {
    return <EmptyState hint={getNoDataHint(
      appState.graphData,
      appState.showOrphans,
      appState.depthMode,
      appState.timelineActive,
    )} />;
  }

  return (
    <LoadedApp
      actions={appActions}
      graphData={appState.graphData}
      pluginRuntime={pluginRuntime}
      state={appState}
      theme={theme}
    />
  );
}
