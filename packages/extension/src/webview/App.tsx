import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import { globMatch } from './lib/globMatch';
import Graph from './components/Graph';
import GraphIcon from './components/GraphIcon';
import { SearchBar } from './components/SearchBar';
import SettingsPanel from './components/SettingsPanel';
import PluginsPanel from './components/PluginsPanel';
import Timeline from './components/Timeline';
import { Button } from './components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './components/ui/dropdown-menu';
import { useTheme } from './hooks/useTheme';
import { IGraphData, IGraphNode, DEFAULT_NODE_COLOR, ExtensionToWebviewMessage } from '../shared/types';
import { postMessage } from './lib/vscodeApi';
import { buildMarkdownExport } from './lib/exportMd';
import { useGraphStore, graphStore } from './store';
import type { SearchOptions } from './components/SearchBar';
import { WebviewPluginHost } from './pluginHost';
import type { CodeGraphyWebviewAPI } from './pluginHost/types';

interface PluginWebviewModule {
  activate?: (api: CodeGraphyWebviewAPI) => void | Promise<void>;
  default?: ((api: CodeGraphyWebviewAPI) => void | Promise<void>) | {
    activate?: (api: CodeGraphyWebviewAPI) => void | Promise<void>;
  };
}

interface PluginInjectPayload {
  pluginId: string;
  scripts: string[];
  styles: string[];
}

/**
 * Filter nodes using advanced search options.
 * Returns matching node IDs and any regex error.
 */
function filterNodesAdvanced(
  nodes: IGraphNode[],
  query: string,
  options: SearchOptions
): { matchingIds: Set<string>; regexError: string | null } {
  const matchingIds = new Set<string>();
  let regexError: string | null = null;

  if (!query.trim()) {
    nodes.forEach(node => matchingIds.add(node.id));
    return { matchingIds, regexError };
  }

  let pattern: RegExp | null = null;

  if (options.regex) {
    try {
      const flags = options.matchCase ? '' : 'i';
      pattern = new RegExp(query, flags);
    } catch (e) {
      regexError = e instanceof Error ? e.message : 'Invalid regex';
      return { matchingIds, regexError };
    }
  } else if (options.wholeWord) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = options.matchCase ? '' : 'i';
    pattern = new RegExp(`\\b${escaped}\\b`, flags);
  }

  for (const node of nodes) {
    const searchText = `${node.label} ${node.id}`;
    let isMatch = false;

    if (pattern) {
      isMatch = pattern.test(searchText);
    } else {
      const normalizedText = options.matchCase ? searchText : searchText.toLowerCase();
      const normalizedQuery = options.matchCase ? query : query.toLowerCase();
      isMatch = normalizedText.includes(normalizedQuery);
    }

    if (isMatch) {
      matchingIds.add(node.id);
    }
  }

  return { matchingIds, regexError };
}

export default function App(): React.ReactElement {
  const pluginHostRef = useRef<WebviewPluginHost>(new WebviewPluginHost());
  const pluginApisRef = useRef<Map<string, CodeGraphyWebviewAPI>>(new Map());
  const loadedStylesRef = useRef<Set<string>>(new Set());
  const activatedScriptKeysRef = useRef<Set<string>>(new Set());

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

  // Filter graph data based on search
  const { filteredData, regexError } = useMemo((): { filteredData: IGraphData | null; regexError: string | null } => {
    if (!graphData) return { filteredData: null, regexError: null };
    if (!searchQuery.trim()) return { filteredData: graphData, regexError: null };

    const result = filterNodesAdvanced(graphData.nodes, searchQuery, searchOptions);
    const matchingNodeIds = result.matchingIds;
    const error = result.regexError;

    const filteredNodes = graphData.nodes.filter(node => matchingNodeIds.has(node.id));
    const filteredEdges = graphData.edges.filter(
      edge => matchingNodeIds.has(edge.from) && matchingNodeIds.has(edge.to)
    );

    return { filteredData: { nodes: filteredNodes, edges: filteredEdges }, regexError: error };
  }, [graphData, searchQuery, searchOptions]);

  // Apply group colors to filtered data
  const coloredData = useMemo((): IGraphData | null => {
    const base = filteredData;
    if (!base) return null;
    if (groups.length === 0) return base;

    const coloredNodes = base.nodes.map(node => {
      for (const group of groups) {
        if (!group.disabled && globMatch(node.id, group.pattern)) {
          return {
            ...node,
            color: group.color,
            shape2D: group.shape2D,
            shape3D: group.shape3D,
            imageUrl: group.imageUrl,
          };
        }
      }
      return { ...node, color: DEFAULT_NODE_COLOR };
    });

    return { ...base, nodes: coloredNodes };
  }, [filteredData, groups]);

  const handleSearchOptionsChange = useCallback((newOptions: SearchOptions) => {
    setSearchOptions(newOptions);
  }, [setSearchOptions]);

  const getPluginApi = useCallback((pluginId: string): CodeGraphyWebviewAPI => {
    const existing = pluginApisRef.current.get(pluginId);
    if (existing) {
      return existing;
    }

    const api = pluginHostRef.current.createAPI(pluginId, postMessage);
    pluginApisRef.current.set(pluginId, api);
    return api;
  }, []);

  const activatePluginScript = useCallback(async (pluginId: string, script: string): Promise<void> => {
    const activationKey = `${pluginId}::${script}`;
    if (activatedScriptKeysRef.current.has(activationKey)) {
      return;
    }

    const mod = (await import(/* @vite-ignore */ script)) as PluginWebviewModule;
    const candidate = mod.activate ?? mod.default;
    const activate = typeof candidate === 'function'
      ? candidate
      : (candidate && typeof candidate === 'object' && 'activate' in candidate
          ? candidate.activate
          : undefined);

    if (typeof activate !== 'function') {
      console.warn(`[CodeGraphy] Webview plugin script "${script}" has no activate(api) export`);
      return;
    }

    await activate(getPluginApi(pluginId));
    activatedScriptKeysRef.current.add(activationKey);
  }, [getPluginApi]);

  const injectPluginAssets = useCallback(async (payload: PluginInjectPayload): Promise<void> => {
    for (const style of payload.styles) {
      if (loadedStylesRef.current.has(style)) continue;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = style;
      document.head.appendChild(link);
      loadedStylesRef.current.add(style);
    }

    for (const script of payload.scripts) {
      try {
        await activatePluginScript(payload.pluginId, script);
      } catch (error) {
        console.error(`[CodeGraphy] Failed to activate webview plugin script "${script}":`, error);
      }
    }
  }, [activatePluginScript]);

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
          pluginHostRef.current.deliverMessage(pluginId, {
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
  }, [injectPluginAssets]);

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
          pluginHost={pluginHostRef.current}
        />
        <div className="absolute top-2 bottom-2 right-2 z-10 flex flex-col justify-end pointer-events-none [&>*]:pointer-events-auto">
          {activePanel !== 'none' ? (
            <>
              <PluginsPanel
                isOpen={activePanel === 'plugins'}
                onClose={() => setActivePanel('none')}
              />
              <SettingsPanel
                isOpen={activePanel === 'settings'}
                onClose={() => setActivePanel('none')}
              />
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              {/* Refresh button */}
              <Button
                variant="outline"
                size="icon"
                className="bg-popover/80 backdrop-blur-sm"
                onClick={() => postMessage({ type: 'REFRESH_GRAPH' })}
                title="Reset Graph"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 20v-6h-6" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 10A8 8 0 0010 4M4 14a8 8 0 0010 6" />
                </svg>
              </Button>
              {/* Export dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="bg-popover/80 backdrop-blur-sm" title="Export">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11l4 4 4-4" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top">
                  <DropdownMenuItem onSelect={() => window.postMessage({ type: 'REQUEST_EXPORT_PNG' }, '*')}>
                    Export as PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => window.postMessage({ type: 'REQUEST_EXPORT_SVG' }, '*')}>
                    Export as SVG
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => window.postMessage({ type: 'REQUEST_EXPORT_JPEG' }, '*')}>
                    Export as JPEG
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => window.postMessage({ type: 'REQUEST_EXPORT_JSON' }, '*')}>
                    Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => {
                    const { graphData: data, groups: storeGroups } = graphStore.getState();
                    if (!data) return;
                    const markdown = buildMarkdownExport(data, storeGroups);
                    postMessage({ type: 'EXPORT_MD', payload: { markdown } });
                  }}>
                    Export as Markdown
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Plugins button (puzzle piece icon) */}
              <Button
                variant="outline"
                size="icon"
                className="bg-popover/80 backdrop-blur-sm"
                onClick={() => setActivePanel('plugins')}
                title="Plugins"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
              </Button>
              {/* Settings button (gear icon) */}
              <Button
                variant="outline"
                size="icon"
                className="bg-popover/80 backdrop-blur-sm"
                onClick={() => setActivePanel('settings')}
                title="Settings"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <Timeline />
    </div>
  );
}
