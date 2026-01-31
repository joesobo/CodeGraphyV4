import React, { useEffect, useRef } from 'react';
import { Network, Options } from 'vis-network';
import { DataSet } from 'vis-data';
import { IGraphData, IGraphNode, IGraphEdge, WebviewToExtensionMessage } from '../../shared/types';

// Get VSCode API (provided by the extension host)
declare function acquireVsCodeApi(): {
  postMessage: (message: WebviewToExtensionMessage) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

// Initialize VSCode API once (must be called only once per webview)
const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : null;

interface GraphProps {
  data: IGraphData;
}

/**
 * Vis Network configuration options
 */
const NETWORK_OPTIONS: Options = {
  nodes: {
    shape: 'dot',
    size: 16,
    font: {
      size: 12,
      color: '#e2e8f0', // Light text for dark theme
    },
    borderWidth: 2,
    borderWidthSelected: 3,
  },
  edges: {
    width: 1,
    color: {
      color: '#475569',
      highlight: '#60a5fa',
      hover: '#60a5fa',
    },
    arrows: {
      to: {
        enabled: true,
        scaleFactor: 0.5,
      },
    },
    smooth: {
      enabled: true,
      type: 'continuous',
      roundness: 0.5,
    },
  },
  physics: {
    enabled: true,
    solver: 'forceAtlas2Based',
    forceAtlas2Based: {
      gravitationalConstant: -50,
      centralGravity: 0.01,
      springLength: 100,
      springConstant: 0.08,
      damping: 0.4,
    },
    stabilization: {
      enabled: true,
      iterations: 200,
      updateInterval: 25,
    },
  },
  interaction: {
    hover: true,
    tooltipDelay: 200,
    zoomView: true,
    dragView: true,
    dragNodes: true,
  },
  layout: {
    randomSeed: 42, // Deterministic initial layout
  },
};

/**
 * Convert IGraphNode to Vis Network node format
 */
function toVisNode(node: IGraphNode) {
  return {
    id: node.id,
    label: node.label,
    color: {
      background: node.color,
      border: node.color,
      highlight: {
        background: node.color,
        border: '#ffffff',
      },
      hover: {
        background: node.color,
        border: '#94a3b8',
      },
    },
    x: node.x,
    y: node.y,
  };
}

/**
 * Convert IGraphEdge to Vis Network edge format
 */
function toVisEdge(edge: IGraphEdge) {
  return {
    id: edge.id,
    from: edge.from,
    to: edge.to,
  };
}

/**
 * Send message to extension
 */
function postMessage(message: WebviewToExtensionMessage): void {
  if (vscode) {
    vscode.postMessage(message);
  } else {
    console.log('Message to extension:', message);
  }
}

/**
 * Send all current positions to extension for persistence
 */
function sendAllPositions(network: Network, nodeIds: string[]): void {
  const allPositions = network.getPositions(nodeIds);
  
  const positions: Record<string, { x: number; y: number }> = {};
  for (const id of nodeIds) {
    const pos = allPositions[id];
    if (pos) {
      positions[id] = { x: pos.x, y: pos.y };
    }
  }
  
  postMessage({ type: 'POSITIONS_UPDATED', payload: { positions } });
}

export default function Graph({ data }: GraphProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesRef = useRef<DataSet<ReturnType<typeof toVisNode>> | null>(null);
  const edgesRef = useRef<DataSet<ReturnType<typeof toVisEdge>> | null>(null);
  const initializedRef = useRef(false);
  const dataRef = useRef(data);

  // Keep dataRef current
  dataRef.current = data;

  /**
   * Initialize network once
   */
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;

    const initialData = dataRef.current;

    // Create datasets
    const nodes = new DataSet(initialData.nodes.map(toVisNode));
    const edges = new DataSet(initialData.edges.map(toVisEdge));

    nodesRef.current = nodes;
    edgesRef.current = edges;

    // Create network
    const network = new Network(
      containerRef.current,
      { nodes, edges },
      NETWORK_OPTIONS
    );

    networkRef.current = network;
    initializedRef.current = true;

    // After stabilization, save all positions
    network.on('stabilizationIterationsDone', () => {
      console.log('[CodeGraphy] Stabilization complete, saving positions');
      sendAllPositions(network, nodes.getIds() as string[]);
    });

    // Event handlers
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0] as string;
        postMessage({ type: 'NODE_SELECTED', payload: { nodeId } });
      }
    });

    network.on('doubleClick', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0] as string;
        postMessage({ type: 'NODE_DOUBLE_CLICKED', payload: { nodeId } });
      }
    });

    network.on('dragEnd', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0] as string;
        const positions = network.getPositions([nodeId]);
        const pos = positions[nodeId];
        if (pos) {
          postMessage({
            type: 'NODE_POSITION_CHANGED',
            payload: { nodeId, x: pos.x, y: pos.y },
          });
        }
      }
    });

    // Notify extension that webview is ready
    postMessage({ type: 'WEBVIEW_READY', payload: null });

    // Cleanup on unmount
    return () => {
      network.destroy();
      networkRef.current = null;
      nodesRef.current = null;
      edgesRef.current = null;
      initializedRef.current = false;
    };
  }, []); // Empty deps - only run once on mount

  /**
   * Update data when props change (after initial mount)
   */
  useEffect(() => {
    if (!initializedRef.current || !nodesRef.current || !edgesRef.current) return;

    // Update nodes
    const currentNodeIds = new Set(nodesRef.current.getIds());
    const newNodeIds = new Set(data.nodes.map((n) => n.id));

    // Remove nodes that no longer exist
    currentNodeIds.forEach((id) => {
      if (!newNodeIds.has(id as string)) {
        nodesRef.current?.remove(id);
      }
    });

    // Add or update nodes
    data.nodes.forEach((node) => {
      if (currentNodeIds.has(node.id)) {
        nodesRef.current?.update(toVisNode(node));
      } else {
        nodesRef.current?.add(toVisNode(node));
      }
    });

    // Update edges similarly
    const currentEdgeIds = new Set(edgesRef.current.getIds());
    const newEdgeIds = new Set(data.edges.map((e) => e.id));

    currentEdgeIds.forEach((id) => {
      if (!newEdgeIds.has(id as string)) {
        edgesRef.current?.remove(id);
      }
    });

    data.edges.forEach((edge) => {
      if (currentEdgeIds.has(edge.id)) {
        edgesRef.current?.update(toVisEdge(edge));
      } else {
        edgesRef.current?.add(toVisEdge(edge));
      }
    });
  }, [data]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 rounded-lg border border-zinc-700 m-1"
      style={{ 
        backgroundColor: '#18181b', // zinc-900
      }}
    />
  );
}
