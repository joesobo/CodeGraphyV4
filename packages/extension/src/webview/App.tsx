import React, { useEffect, useCallback } from 'react';
import Graph from './components/Graph';
import { GraphIcon } from './components/icons';
import { SearchBar } from './components/SearchBar';
import SettingsPanel from './components/settingsPanel/Panel';
import PluginsPanel from './components/PluginsPanel';
import Timeline from './components/Timeline';
import Toolbar from './components/Toolbar';
import { useTheme } from './useTheme';
import { usePluginManager } from './usePluginManager';
import { useFilteredGraph } from './useFilteredGraph';
import { ExtensionToWebviewMessage } from '../shared/types';
import { postMessage } from './vscodeApi';
import { useGraphStore, graphStore } from './store';
import type { SearchOptions } from './components/SearchBar';
import {
  getNoDataHint,
  normalizePluginInjectPayload,
  parsePluginScopedMessage,
} from './appMessages';

export default function App(): React.ReactElement {
  const { pluginHost, injectPluginAssets } = usePluginManager();

  // Read state from store
  const graphData = useGraphStore(s => s.graphData);
  const isLoading = useGraphStore(s => s.isLoading);
  const searchQuery = useGraphStore(s => s.searchQuery);
  const searchOptions = useGraphStore(s => s.searchOptions);
  const groups = useGraphStore(s => s.groups);
  const showOrphans = useGraphStore(s => s.showOrphans);
  const timelineActive = useGraphStore(s => s.timelineActive);
  const activePanel = useGraphStore(s => s.activePanel);
  const nodeDecorations = useGraphStore(s => s.nodeDecorations);
  const edgeDecorations = useGraphStore(s => s.edgeDecorations);

  // Store actions
  const setSearchQuery = useGraphStore(s => s.setSearchQuery);
  const setSearchOptions = useGraphStore(s => s.setSearchOptions);
  const setActivePanel = useGraphStore(s => s.setActivePanel);

  const theme = useTheme();

  // Derived graph data (filtered + colored)
  const { filteredData, coloredData, regexError } = useFilteredGraph(
    graphData,
    searchQuery,
    searchOptions,
    groups,
  );

  const handleSearchOptionsChange = useCallback((newOptions: SearchOptions) => {
    setSearchOptions(newOptions);
  }, [setSearchOptions]);

  // Listen for extension messages and delegate to store
  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      const raw = event.data as { type?: unknown; payload?: unknown; data?: unknown };
      if (!raw || typeof raw !== 'object' || typeof raw.type !== 'string') {
        return;
      }

      if (raw.type === 'PLUGIN_WEBVIEW_INJECT') {
        const payload = normalizePluginInjectPayload(raw.payload);
        if (payload) {
          void injectPluginAssets({
            pluginId: payload.pluginId,
            scripts: payload.scripts,
            styles: payload.styles,
          });
        }
        return;
      }

      const scopedMessage = parsePluginScopedMessage(raw.type, raw.data);
      if (scopedMessage) {
        pluginHost.deliverMessage(scopedMessage.pluginId, scopedMessage.message);
        return;
      }

      graphStore.getState().handleExtensionMessage(raw as ExtensionToWebviewMessage);
    };

    window.addEventListener('message', handleMessage);
    postMessage({ type: 'WEBVIEW_READY', payload: null });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [injectPluginAssets, pluginHost]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="flex items-center gap-3 mb-4">
          <GraphIcon className="w-10 h-10 animate-pulse" />
          <h1 className="text-2xl font-bold text-primary">CodeGraphy</h1>
        </div>
        <p className="text-secondary">Loading graph...</p>
      </div>
    );
  }

  // No data state — skip during timeline mode (empty graph at early commits is valid)
  if (!timelineActive && (!graphData || graphData.nodes.length === 0)) {
    const hint = getNoDataHint(graphData, showOrphans);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="flex items-center gap-3 mb-4">
          <GraphIcon className="w-10 h-10" />
          <h1 className="text-2xl font-bold text-primary">CodeGraphy</h1>
        </div>
        <p className="text-secondary text-center">No files found. {hint}</p>
      </div>
    );
  }

  // During timeline, graphData may be null/empty before first commit data arrives
  const effectiveGraphData = graphData ?? { nodes: [], edges: [] };

  // Graph view with search bar
  return (
    <div className="relative w-full h-screen flex flex-col">
      {/* Header with search bar */}
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

      {/* Graph */}
      <div className="flex-1 relative">
        <Graph
          data={coloredData || effectiveGraphData}
          theme={theme}
          nodeDecorations={nodeDecorations}
          edgeDecorations={edgeDecorations}
          pluginHost={pluginHost}
        />
        {activePanel !== 'none' ? (
          <div className="absolute top-2 bottom-2 right-2 z-10 flex flex-col justify-end pointer-events-none [&>*]:pointer-events-auto">
            <PluginsPanel
              isOpen={activePanel === 'plugins'}
              onClose={() => setActivePanel('none')}
            />
            <SettingsPanel
              isOpen={activePanel === 'settings'}
              onClose={() => setActivePanel('none')}
            />
          </div>
        ) : (
          <div className="absolute bottom-2 left-2 right-2 z-10 pointer-events-none [&>*]:pointer-events-auto">
            <Toolbar />
          </div>
        )}
      </div>

      {/* Timeline */}
      <Timeline />
    </div>
  );
}
