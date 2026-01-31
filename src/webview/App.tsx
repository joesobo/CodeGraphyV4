import React, { useEffect, useState } from 'react';
import Graph from './components/Graph';
import GraphIcon from './components/GraphIcon';
import { IGraphData, ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../shared/types';
import { getMockGraphData } from '../shared/mockData';

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

export default function App(): React.ReactElement {
  const [graphData, setGraphData] = useState<IGraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      const message = event.data;
      
      switch (message.type) {
        case 'GRAPH_DATA_UPDATED':
          setGraphData(message.payload);
          setIsLoading(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // Tell extension we're ready to receive data
    if (vscode) {
      vscode.postMessage({ type: 'WEBVIEW_READY' });
    } else {
      // Standalone dev mode - use mock data after delay
      setTimeout(() => {
        console.log('Using mock data for standalone development');
        setGraphData(getMockGraphData());
        setIsLoading(false);
      }, 500);
    }

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

  // Graph view - relative container for absolute positioned graph
  return (
    <div className="relative w-full h-screen">
      <Graph data={graphData} />
    </div>
  );
}
