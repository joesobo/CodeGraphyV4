import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Graph from './components/Graph';
import GraphIcon from './components/GraphIcon';
import { SearchBar, SearchOptions } from './components/SearchBar';
import { ViewSwitcher } from './components/ViewSwitcher';
import PhysicsSettings from './components/PhysicsSettings';
import { useTheme } from './hooks/useTheme';
import { IGraphData, IGraphNode, IAvailableView, BidirectionalEdgeMode, IPhysicsSettings, ExtensionToWebviewMessage } from '../shared/types';
import { getVsCodeApi } from './vscodeApi';

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
  const [activeViewId, setActiveViewId] = useState<string>('codegraphy.file-dependencies');
  const [physicsSettings, setPhysicsSettings] = useState<IPhysicsSettings>(DEFAULT_PHYSICS);
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
          break;
        case 'VIEWS_UPDATED':
          setAvailableViews(message.payload.views);
          setActiveViewId(message.payload.activeViewId);
          break;
        case 'PHYSICS_SETTINGS_UPDATED':
          setPhysicsSettings(message.payload);
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // Tell extension we're ready to receive data
    const vscode = getVsCodeApi();
    if (vscode) {
      vscode.postMessage({ type: 'WEBVIEW_READY', payload: null });
    }
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
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="flex items-center gap-3 mb-4">
          <GraphIcon className="w-10 h-10" />
          <h1 className="text-2xl font-bold text-primary">CodeGraphy</h1>
        </div>
        <p className="text-secondary text-center">
          No files found. Open a folder to visualize its structure.
        </p>
      </div>
    );
  }

  // Graph view with search bar and view switcher
  return (
    <div className="relative w-full h-screen flex flex-col">
      {/* Header with search bar and view switcher */}
      <div className="flex-shrink-0 p-2 border-b border-[var(--vscode-panel-border,#3c3c3c)] flex items-center gap-2">
        <div className="flex-1">
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
        <ViewSwitcher
          views={availableViews}
          activeViewId={activeViewId}
        />
      </div>
      
      {/* Graph */}
      <div className="flex-1 relative">
        <Graph 
          data={filteredData || graphData} 
          favorites={favorites} 
          theme={theme}
          bidirectionalMode={bidirectionalMode}
          physicsSettings={physicsSettings}
        />
        <PhysicsSettings 
          settings={physicsSettings} 
          onSettingsChange={setPhysicsSettings}
        />
      </div>
    </div>
  );
}
