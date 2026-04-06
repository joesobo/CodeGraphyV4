import React, { useEffect, useCallback } from 'react';
import Graph from '../components/Graph';
import { SearchBar } from '../components/searchBar/Field';
import SettingsPanel from '../components/settingsPanel/Drawer';
import PluginsPanel from '../components/plugins/Panel';
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

export default function App(): React.ReactElement {
  const { pluginHost, injectPluginAssets } = usePluginManager();
  const { graphData, isLoading, searchQuery, searchOptions, groups, showOrphans, activePanel, nodeDecorations, edgeDecorations, activeFilePath } = useAppState();
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

  if (!graphData) {
    return <EmptyState hint={getNoDataHint(graphData, showOrphans)} />;
  }

  const hasGraphNodes = graphData.nodes.length > 0;

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
              edgeDecorations={edgeDecorations}
              pluginHost={pluginHost}
            />
            <DepthViewControls />
          </>
        ) : (
          <EmptyState hint={getNoDataHint(graphData, showOrphans)} fullScreen={false} />
        )}
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
          <PluginsPanel isOpen={activePanel === 'plugins'} onClose={() => setActivePanel('none')} />
          <SettingsPanel isOpen={activePanel === 'settings'} onClose={() => setActivePanel('none')} />
        </div>
      </div>
    </div>
  );
}
