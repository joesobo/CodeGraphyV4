import React, { useEffect, useCallback } from 'react';
import Graph from './components/Graph';
import { SearchBar } from './components/SearchBar';
import SettingsPanel from './components/settingsPanel/Panel';
import PluginsPanel from './components/PluginsPanel';
import Timeline from './components/Timeline';
import Toolbar from './components/Toolbar';
import { useTheme } from './useTheme';
import { usePluginManager } from './usePluginManager';
import { useFilteredGraph } from './useFilteredGraph';
import type { SearchOptions } from './components/SearchBar';
import { getNoDataHint } from './appMessages';
import { setupMessageListener } from './appMessageListener';
import { LoadingState, EmptyState } from './appStates';
import { useAppState, useAppActions } from './appStoreSelectors';

export default function App(): React.ReactElement {
  const { pluginHost, injectPluginAssets } = usePluginManager();
  const { graphData, isLoading, searchQuery, searchOptions, groups, showOrphans, timelineActive, activePanel, nodeDecorations, edgeDecorations } = useAppState();
  const { setSearchQuery, setSearchOptions, setActivePanel } = useAppActions();

  const theme = useTheme();
  const { filteredData, coloredData, regexError } = useFilteredGraph(graphData, searchQuery, searchOptions, groups);

  const handleSearchOptionsChange = useCallback((newOptions: SearchOptions) => {
    setSearchOptions(newOptions);
  }, [setSearchOptions]);

  useEffect(() => {
    return setupMessageListener(injectPluginAssets, pluginHost);
  }, [injectPluginAssets, pluginHost]);

  if (isLoading) return <LoadingState />;

  if (!timelineActive && (!graphData || graphData.nodes.length === 0)) {
    return <EmptyState hint={getNoDataHint(graphData, showOrphans)} />;
  }

  const effectiveGraphData = graphData ?? { nodes: [], edges: [] };

  return (
    <div className="relative w-full h-screen flex flex-col">
      <div className="flex-shrink-0 p-2 border-b border-[var(--vscode-panel-border,#3c3c3c)]">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          options={searchOptions}
          onOptionsChange={handleSearchOptionsChange}
          resultCount={filteredData?.nodes.length}
          totalCount={effectiveGraphData.nodes.length}
          placeholder="Search files... (Ctrl+F)"
          regexError={regexError}
        />
      </div>
      <div className="flex-1 relative">
        <Graph data={coloredData || effectiveGraphData} theme={theme} nodeDecorations={nodeDecorations} edgeDecorations={edgeDecorations} pluginHost={pluginHost} />
        {activePanel !== 'none' ? (
          <div className="absolute top-2 bottom-2 right-2 z-10 flex flex-col justify-end pointer-events-none [&>*]:pointer-events-auto">
            <PluginsPanel isOpen={activePanel === 'plugins'} onClose={() => setActivePanel('none')} />
            <SettingsPanel isOpen={activePanel === 'settings'} onClose={() => setActivePanel('none')} />
          </div>
        ) : (
          <div className="absolute bottom-2 left-2 right-2 z-10 pointer-events-none [&>*]:pointer-events-auto">
            <Toolbar />
          </div>
        )}
      </div>
      <Timeline />
    </div>
  );
}
