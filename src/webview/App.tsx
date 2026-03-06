import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { minimatch } from 'minimatch';
import Graph from './components/Graph';
import GraphIcon from './components/GraphIcon';
import { SearchBar, SearchOptions } from './components/SearchBar';
import SettingsPanel from './components/SettingsPanel';
import { useTheme } from './hooks/useTheme';
import { IGraphData, IGraphNode, IAvailableView, BidirectionalEdgeMode, IPhysicsSettings, IGroup, NodeSizeMode, DEFAULT_NODE_COLOR, ExtensionToWebviewMessage } from '../shared/types';
import { postMessage } from './lib/vscodeApi';

/** Default physics settings */
const DEFAULT_PHYSICS: IPhysicsSettings = {
  gravitationalConstant: -50,
  springLength: 100,
  springConstant: 0.08,
  damping: 0.4,
  centralGravity: 0.01,
};

/** Default search options */
const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  matchCase: false,
  wholeWord: false,
  regex: false,
};

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
    // Empty query = all nodes match
    nodes.forEach(node => matchingIds.add(node.id));
    return { matchingIds, regexError };
  }

  let pattern: RegExp | null = null;

  if (options.regex) {
    // Build regex from query
    try {
      const flags = options.matchCase ? '' : 'i';
      pattern = new RegExp(query, flags);
    } catch (e) {
      regexError = e instanceof Error ? e.message : 'Invalid regex';
      return { matchingIds, regexError };
    }
  } else if (options.wholeWord) {
    // Build word boundary regex
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
      // Simple substring match
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
  const [graphData, setGraphData] = useState<IGraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [bidirectionalMode, setBidirectionalMode] = useState<BidirectionalEdgeMode>('separate');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOptions, setSearchOptions] = useState<SearchOptions>(DEFAULT_SEARCH_OPTIONS);
  const [availableViews, setAvailableViews] = useState<IAvailableView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string>('codegraphy.connections');
  const [physicsSettings, setPhysicsSettings] = useState<IPhysicsSettings>(DEFAULT_PHYSICS);
  const [depthLimit, setDepthLimit] = useState<number>(1);
  const [groups, setGroups] = useState<IGroup[]>([]);
  const [filterPatterns, setFilterPatterns] = useState<string[]>([]);
  const [pluginFilterPatterns, setPluginFilterPatterns] = useState<string[]>([]);
  const [nodeSizeMode, setNodeSizeMode] = useState<NodeSizeMode>('connections');
  const [showOrphans, setShowOrphans] = useState<boolean>(true);
  const [showArrows, setShowArrows] = useState<boolean>(true);
  const theme = useTheme();

  // Filter graph data based on search (always uses exact substring matching)
  const { filteredData, regexError } = useMemo((): { filteredData: IGraphData | null; regexError: string | null } => {
    if (!graphData) return { filteredData: null, regexError: null };
    if (!searchQuery.trim()) return { filteredData: graphData, regexError: null };

    // Use exact substring/regex matching (not fuzzy search)
    const result = filterNodesAdvanced(graphData.nodes, searchQuery, searchOptions);
    const matchingNodeIds = result.matchingIds;
    const error = result.regexError;

    // Filter nodes
    const filteredNodes = graphData.nodes.filter(node => matchingNodeIds.has(node.id));

    // Filter edges - only keep edges where BOTH nodes are visible
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
        if (minimatch(node.id, group.pattern, { matchBase: true })) {
          return { ...node, color: group.color };
        }
      }
      return { ...node, color: DEFAULT_NODE_COLOR };
    });

    return { ...base, nodes: coloredNodes };
  }, [filteredData, groups]);

  const handleSearchOptionsChange = useCallback((newOptions: SearchOptions) => {
    setSearchOptions(newOptions);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      const message = event.data;
      
      switch (message.type) {
        case 'GRAPH_DATA_UPDATED':
          setGraphData(message.payload);
          setIsLoading(false);
          break;
        case 'FAVORITES_UPDATED':
          setFavorites(new Set(message.payload.favorites));
          break;
        case 'SETTINGS_UPDATED':
          setBidirectionalMode(message.payload.bidirectionalEdges);
          setShowOrphans(message.payload.showOrphans);
          break;
        case 'GROUPS_UPDATED':
          setGroups(message.payload.groups);
          break;
        case 'FILTER_PATTERNS_UPDATED':
          setFilterPatterns(message.payload.patterns);
          setPluginFilterPatterns(message.payload.pluginPatterns);
          break;
        case 'VIEWS_UPDATED':
          setAvailableViews(message.payload.views);
          setActiveViewId(message.payload.activeViewId);
          break;
        case 'PHYSICS_SETTINGS_UPDATED':
          setPhysicsSettings(message.payload);
          break;
        case 'DEPTH_LIMIT_UPDATED':
          setDepthLimit(message.payload.depthLimit);
          break;
        case 'SHOW_ARROWS_UPDATED':
          setShowArrows(message.payload.showArrows);
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // Tell extension we're ready to receive data
    postMessage({ type: 'WEBVIEW_READY', payload: null });
    // No mock data fallback - extension will send real data

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []); // Run once on mount

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

  // No data state
  if (!graphData || graphData.nodes.length === 0) {
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
          totalCount={graphData.nodes.length}
          placeholder="Search files... (Ctrl+F)"
          regexError={regexError}
        />
      </div>

      {/* Graph */}
      <div className="flex-1 relative">
        <Graph
          data={coloredData || graphData}
          favorites={favorites}
          theme={theme}
          bidirectionalMode={bidirectionalMode}
          physicsSettings={physicsSettings}
          nodeSizeMode={nodeSizeMode}
          showArrows={showArrows}
        />
        <SettingsPanel
          settings={physicsSettings}
          onSettingsChange={setPhysicsSettings}
          groups={groups}
          onGroupsChange={setGroups}
          filterPatterns={filterPatterns}
          onFilterPatternsChange={setFilterPatterns}
          pluginFilterPatterns={pluginFilterPatterns}
          showOrphans={showOrphans}
          onShowOrphansChange={setShowOrphans}
          nodeSizeMode={nodeSizeMode}
          onNodeSizeModeChange={setNodeSizeMode}
          availableViews={availableViews}
          activeViewId={activeViewId}
          onViewChange={setActiveViewId}
          depthLimit={depthLimit}
          showArrows={showArrows}
          onShowArrowsChange={setShowArrows}
        />
      </div>
    </div>
  );
}
