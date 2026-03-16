import React, { useEffect, useCallback } from 'react';
import Graph from './components/Graph';
import { GraphIcon } from './components/icons';
import { SearchBar } from './components/SearchBar';
import SettingsPanel from './components/SettingsPanel';
import PluginsPanel from './components/PluginsPanel';
import Timeline from './components/Timeline';
import Toolbar from './components/Toolbar';
import { useTheme } from './hooks/useTheme';
import { useFilteredGraph } from './hooks/useFilteredGraph';
import { usePluginManager } from './hooks/usePluginManager';
import { ExtensionToWebviewMessage } from '../shared/types';
import { postMessage } from './lib/vscodeApi';
import { useGraphStore, graphStore } from './store';
import type { PluginInjectPayload } from './hooks/usePluginManager';

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

  const { filteredData, coloredData, regexError } = useFilteredGraph(graphData, searchQuery, searchOptions, groups);

  const handleSearchOptionsChange = useCallback((newOptions: typeof searchOptions) => {
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
        const payload = raw.payload as PluginInjectPayload;
        if (payload && typeof payload.pluginId === 'string') {
          void injectPluginAssets({
            pluginId: payload.pluginId,
            scripts: Array.isArray(payload.scripts) ? payload.scripts : [],
            styles: Array.isArray(payload.styles) ? payload.styles : [],
          });
        }
        return;
      }

      if (raw.type.startsWith('plugin:')) {
        const [, pluginId, ...typeParts] = raw.type.split(':');
        if (pluginId && typeParts.length > 0) {
          pluginHost.deliverMessage(pluginId, {
            type: typeParts.join(':'),
            data: raw.data,
          });
        }
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
    const hint = graphData && !showOrphans
      ? 'All files are hidden. Try enabling "Show Orphans" in Settings → Filters.'
      : 'Open a folder to visualize its structure.';
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
