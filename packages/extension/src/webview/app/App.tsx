import React, { useEffect, useCallback, useMemo, useState } from 'react';
import Graph from '../components/Graph';
import { SearchBar } from '../components/searchBar/Field';
import SettingsPanel from '../components/settingsPanel/Drawer';
import PluginsPanel from '../components/plugins/Panel';
import LegendsPanel from '../components/legends/Panel';
import NodesPanel from '../components/nodes/Panel';
import EdgesPanel from '../components/edges/Panel';
import ExportPanel from '../components/export/Panel';
import Toolbar from '../components/Toolbar';
import { DepthViewControls } from '../components/depthView/view';
import { ActiveFileBreadcrumb } from '../components/activeFileBreadcrumb/view';
import { useTheme } from '../theme/useTheme';
import { usePluginManager } from '../pluginRuntime/useManager';
import { useFilteredGraph } from '../search/useFilteredGraph';
import type { SearchOptions } from '../components/searchBar/field/model';
import { getNoDataHint } from './messages';
import { setupMessageListener } from './messageListener';
import { LoadingState, EmptyState } from './states';
import { useAppState, useAppActions } from './storeSelectors';
import { SlotHost } from '../pluginHost/slotHost/view';
import { GraphIndexStatus } from '../components/graphIndexStatus/view';
import { GraphCornerControls } from '../components/graphCornerControls/view';
import { RulePrompt, type RulePromptState } from './RulePrompt';
import { useGraphStore } from '../store/state';
import { postMessage } from '../vscodeApi';

const COUNT_FORMATTER = new Intl.NumberFormat('en-US');

function formatGraphStat(count: number, singular: string, plural: string): string {
  const label = count === 1 ? singular : plural;
  return `${COUNT_FORMATTER.format(count)} ${label}`;
}

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
  const activeFilterPatterns = useMemo(
    () => [...pluginFilterPatterns, ...filterPatterns],
    [filterPatterns, pluginFilterPatterns],
  );
  const userLegendRules = useMemo(
    () => legends.filter((legend) => !legend.isPluginDefault),
    [legends],
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

  const handleSearchOptionsChange = useCallback((newOptions: SearchOptions) => {
    setSearchOptions(newOptions);
  }, [setSearchOptions]);

  const handleRulePromptSubmit = useCallback((nextState: RulePromptState) => {
    if (nextState.kind === 'filter') {
      const normalizedPattern = nextState.pattern.trim();
      if (normalizedPattern && !filterPatterns.includes(normalizedPattern)) {
        const nextPatterns = [...filterPatterns, normalizedPattern];
        setFilterPatterns(nextPatterns);
        postMessage({ type: 'UPDATE_FILTER_PATTERNS', payload: { patterns: nextPatterns } });
      }
      setRulePrompt(null);
      return;
    }

    const normalizedPattern = nextState.pattern.trim();
    if (normalizedPattern) {
      const nextLegends = [
        ...userLegendRules,
        {
          id: `legend:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
          pattern: normalizedPattern,
          color: nextState.color,
          target: nextState.target,
        },
      ];
      setOptimisticUserLegends(nextLegends);
      postMessage({
        type: 'UPDATE_LEGENDS',
        payload: { legends: nextLegends },
      });
    }
    setRulePrompt(null);
  }, [filterPatterns, setFilterPatterns, setOptimisticUserLegends, userLegendRules]);

  useEffect(() => {
    return setupMessageListener(injectPluginAssets, pluginHost);
  }, [injectPluginAssets, pluginHost]);

  if (isLoading) return <LoadingState />;

  if (!graphData) {
    return <EmptyState hint={getNoDataHint(graphData, showOrphans, depthMode)} />;
  }

  const displayGraphData = coloredData || graphData;
  const hasGraphNodes = graphData.nodes.length > 0;
  const graphStatsLabel = `${formatGraphStat(displayGraphData.nodes.length, 'node', 'nodes')} • ${formatGraphStat(displayGraphData.edges.length, 'edge', 'edges')}`;

  return (
    <div className="relative w-full h-screen flex flex-col">
      <div className="flex-shrink-0 p-2 border-b border-[var(--vscode-panel-border,#3c3c3c)]">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          options={searchOptions}
          onOptionsChange={handleSearchOptionsChange}
          resultCount={filteredData?.nodes.length}
          totalCount={graphData.nodes.length}
          placeholder="Search files... (Ctrl+F)"
          regexError={regexError}
        />
        <div className="mt-1.5 min-h-5">
          <ActiveFileBreadcrumb filePath={activeFilePath} />
        </div>
      </div>
      <div className="flex-1 min-h-0 relative">
        {hasGraphNodes ? (
          <>
            <Graph
              data={coloredData || graphData}
              theme={theme}
              nodeDecorations={nodeDecorations}
              edgeDecorations={graphEdgeDecorations}
              onAddFilterRequested={(pattern) => setRulePrompt({ kind: 'filter', pattern })}
              onAddLegendRequested={(rule) => setRulePrompt({ kind: 'legend', ...rule })}
              pluginHost={pluginHost}
            />
            <DepthViewControls />
          </>
        ) : (
          <EmptyState hint={getNoDataHint(graphData, showOrphans, depthMode)} fullScreen={false} />
        )}
        <div className="pointer-events-none absolute right-2 top-2 z-10 rounded-md bg-background/50 px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm">
          {graphStatsLabel}
        </div>
        <div className="absolute inset-y-2 left-2 z-10 pointer-events-none">
          <div className="h-full pointer-events-auto">
            <Toolbar pluginHost={pluginHost} />
          </div>
        </div>
        <div className="absolute top-2 bottom-2 right-2 z-10 flex flex-col justify-end pointer-events-none [&>*]:pointer-events-auto">
          <SlotHost
            pluginHost={pluginHost}
            slot="node-details"
            data-testid="node-details-slot"
            className="bg-popover/95 backdrop-blur-sm rounded-lg border w-72 shadow-lg max-h-full flex flex-col overflow-hidden mb-2"
          />
          <NodesPanel isOpen={activePanel === 'nodes'} onClose={() => setActivePanel('none')} />
          <EdgesPanel isOpen={activePanel === 'edges'} onClose={() => setActivePanel('none')} />
          <LegendsPanel isOpen={activePanel === 'legends'} onClose={() => setActivePanel('none')} />
          <ExportPanel isOpen={activePanel === 'export'} onClose={() => setActivePanel('none')} />
          <PluginsPanel isOpen={activePanel === 'plugins'} onClose={() => setActivePanel('none')} />
          <SettingsPanel isOpen={activePanel === 'settings'} onClose={() => setActivePanel('none')} />
          {hasGraphNodes && activePanel === 'none' ? (
            <div className="mt-2 self-end">
              <GraphCornerControls />
            </div>
          ) : null}
        </div>
        <GraphIndexStatus isIndexing={graphIsIndexing} progress={graphIndexProgress} />
        <RulePrompt
          state={rulePrompt}
          onClose={() => setRulePrompt(null)}
          onSubmit={handleRulePromptSubmit}
        />
      </div>
    </div>
  );
}
