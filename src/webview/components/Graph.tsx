import React, { useEffect, useRef, useCallback } from 'react';
import { Network, Options } from 'vis-network';
import { DataSet } from 'vis-data';
import { IGraphData, WebviewToExtensionMessage } from '../../shared/types';

// Get VSCode API (provided by the extension host)
declare function acquireVsCodeApi(): {
  postMessage: (message: WebviewToExtensionMessage) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

// Initialize VSCode API once
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

export default function Graph({ data }: GraphProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

  /**
   * Send message to extension
   */
  const postMessage = useCallback((message: WebviewToExtensionMessage) => {
    if (vscode) {
      vscode.postMessage(message);
    } else {
      // In development/testing, just log
      console.log('Message to extension:', message);
    }
  }, []);

  /**
   * Initialize the network
   */
  useEffect(() => {
    if (!containerRef.current) return;

    // Create datasets
    const nodes = new DataSet(
      data.nodes.map((node) => ({
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
      }))
    );

    const edges = new DataSet(
      data.edges.map((edge) => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
      }))
    );

    // Create network
    const network = new Network(
      containerRef.current,
      { nodes, edges },
      NETWORK_OPTIONS
    );

    networkRef.current = network;

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

    // Cleanup
    return () => {
      network.destroy();
      networkRef.current = null;
    };
  }, [data, postMessage]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: '100vh' }}
    />
  );
}
