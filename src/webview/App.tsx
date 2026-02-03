import React, { useEffect, useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import Graph from './components/Graph';
import GraphIcon from './components/GraphIcon';
import { SearchBar } from './components/SearchBar';
import { ViewSwitcher } from './components/ViewSwitcher';
import { DepthSlider } from './components/DepthSlider';
import { useTheme } from './hooks/useTheme';
import { IGraphData, IAvailableView, BidirectionalEdgeMode, ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../shared/types';

// Get VSCode API if available (must be called exactly once at module level)
declare function acquireVsCodeApi(): {
  postMessage: (message: WebviewToExtensionMessage) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

// Acquire the API once at module load (VSCode requirement)
let vscode: ReturnType<typeof acquireVsCodeApi> | null = null;
try {
  if (typeof acquireVsCodeApi !== 'undefined') {
    vscode = acquireVsCodeApi();
  }
} catch {
  // Already acquired or not in VSCode context
  vscode = null;
}

/** Fuse.js options for fuzzy search */
const FUSE_OPTIONS = {
  keys: ['label', 'id'],
  threshold: 0.4,
  ignoreLocation: true,
};

export default function App(): React.ReactElement {
  const [graphData, setGraphData] = useState<IGraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [bidirectionalMode, setBidirectionalMode] = useState<BidirectionalEdgeMode>('separate');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableViews, setAvailableViews] = useState<IAvailableView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string>('codegraphy.file-dependencies');
  const [depthLimit, setDepthLimit] = useState<number>(1);
  const theme = useTheme();

  // Create fuse instance for fuzzy search
  const fuse = useMemo(() => {
    if (!graphData) return null;
    return new Fuse(graphData.nodes, FUSE_OPTIONS);
  }, [graphData]);

  // Filter graph data based on search
  const filteredData = useMemo((): IGraphData | null => {
    if (!graphData) return null;
    if (!searchQuery.trim()) return graphData;
    if (!fuse) return graphData;

    // Get matching nodes
    const results = fuse.search(searchQuery);
    const matchingNodeIds = new Set(results.map(r => r.item.id));

    // Filter nodes
    const filteredNodes = graphData.nodes.filter(node => matchingNodeIds.has(node.id));

    // Filter edges - only keep edges where BOTH nodes are visible
    const filteredEdges = graphData.edges.filter(
      edge => matchingNodeIds.has(edge.from) && matchingNodeIds.has(edge.to)
    );

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [graphData, searchQuery, fuse]);

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
        case 'DEPTH_LIMIT_UPDATED':
          setDepthLimit(message.payload.depthLimit);
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // Tell extension we're ready to receive data
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
            resultCount={filteredData?.nodes.length}
            totalCount={graphData.nodes.length}
            placeholder="Search files... (Ctrl+F)"
          />
        </div>
{activeViewId === 'codegraphy.depth-graph' && (
          <DepthSlider depthLimit={depthLimit} />
        )}
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
        />
      </div>
    </div>
  );
}
