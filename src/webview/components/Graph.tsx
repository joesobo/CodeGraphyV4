/**
 * @fileoverview Graph component that renders the dependency visualization.
 * Uses Vis Network for force-directed graph layout with physics simulation.
 * @module webview/components/Graph
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Network, Options } from 'vis-network';
import { DataSet } from 'vis-data';
import {
  IGraphData,
  IGraphNode,
  IGraphEdge,
  IFileInfo,
  BidirectionalEdgeMode,
  WebviewToExtensionMessage,
  ExtensionToWebviewMessage,
  NodeSizeMode,
} from '../../shared/types';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from './ui/context-menu';
import { NodeTooltip } from './NodeTooltip';
import { ThemeKind, adjustColorForLightTheme } from '../hooks/useTheme';

// Get VSCode API (provided by the extension host)
declare function acquireVsCodeApi(): {
  postMessage: (message: WebviewToExtensionMessage) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

// Initialize VSCode API once (must be called only once per webview)
const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : null;

/** Yellow color for favorites */
const FAVORITE_BORDER_COLOR = '#EAB308';

interface GraphProps {
  data: IGraphData;
  favorites?: Set<string>;
  onFavoritesChange?: (favorites: Set<string>) => void;
  theme?: ThemeKind;
  bidirectionalMode?: BidirectionalEdgeMode;
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
      color: '#e2e8f0',
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
    multiselect: true,
    selectConnectedEdges: false,
    keyboard: {
      enabled: true,
      bindToWindow: false,
    },
  },
  layout: {
    randomSeed: 42,
  },
};

/** Minimum and maximum node sizes */
const MIN_NODE_SIZE = 10;
const MAX_NODE_SIZE = 40;
const DEFAULT_NODE_SIZE = 16;

/**
 * Calculate node sizes for all nodes based on the sizing mode.
 * Returns a map of node ID to size.
 */
function calculateNodeSizes(
  nodes: IGraphNode[],
  edges: { from: string; to: string }[],
  mode: NodeSizeMode
): Map<string, number> {
  const sizes = new Map<string, number>();

  if (mode === 'uniform') {
    // All nodes same size
    for (const node of nodes) {
      sizes.set(node.id, DEFAULT_NODE_SIZE);
    }
    return sizes;
  }

  if (mode === 'connections') {
    // Size by connection count
    const connectionCounts = new Map<string, number>();
    
    // Count connections for each node
    for (const node of nodes) {
      connectionCounts.set(node.id, 0);
    }
    for (const edge of edges) {
      connectionCounts.set(edge.from, (connectionCounts.get(edge.from) ?? 0) + 1);
      connectionCounts.set(edge.to, (connectionCounts.get(edge.to) ?? 0) + 1);
    }

    // Find min/max for normalization
    const counts = Array.from(connectionCounts.values());
    const minCount = Math.min(...counts, 0);
    const maxCount = Math.max(...counts, 1);
    const range = maxCount - minCount || 1;

    // Calculate sizes
    for (const node of nodes) {
      const count = connectionCounts.get(node.id) ?? 0;
      const normalized = (count - minCount) / range;
      const size = MIN_NODE_SIZE + normalized * (MAX_NODE_SIZE - MIN_NODE_SIZE);
      sizes.set(node.id, size);
    }
    return sizes;
  }

  if (mode === 'access-count') {
    // Size by access/visit count (how many times file was opened)
    const accessCounts = nodes.map(n => n.accessCount ?? 0);
    const minCount = Math.min(...accessCounts, 0);
    const maxCount = Math.max(...accessCounts, 1);
    const range = maxCount - minCount || 1;

    for (const node of nodes) {
      const count = node.accessCount ?? 0;
      const normalized = (count - minCount) / range;
      const size = MIN_NODE_SIZE + normalized * (MAX_NODE_SIZE - MIN_NODE_SIZE);
      sizes.set(node.id, size);
    }
    return sizes;
  }

  if (mode === 'file-size') {
    // Size by file size in bytes
    const fileSizes = nodes
      .map(n => n.fileSize ?? 0)
      .filter(s => s > 0);

    if (fileSizes.length === 0) {
      // No file sizes available, fall back to uniform
      for (const node of nodes) {
        sizes.set(node.id, DEFAULT_NODE_SIZE);
      }
      return sizes;
    }

    // Use logarithmic scale for file sizes (to handle large variance)
    const logSizes = fileSizes.map(s => Math.log10(s + 1));
    const minLog = Math.min(...logSizes);
    const maxLog = Math.max(...logSizes);
    const range = maxLog - minLog || 1;

    for (const node of nodes) {
      const fileSize = node.fileSize ?? 0;
      if (fileSize === 0) {
        sizes.set(node.id, MIN_NODE_SIZE);
      } else {
        const logSize = Math.log10(fileSize + 1);
        const normalized = (logSize - minLog) / range;
        const size = MIN_NODE_SIZE + normalized * (MAX_NODE_SIZE - MIN_NODE_SIZE);
        sizes.set(node.id, size);
      }
    }
    return sizes;
  }

  // Default fallback
  for (const node of nodes) {
    sizes.set(node.id, DEFAULT_NODE_SIZE);
  }
  return sizes;
}

/**
 * Calculate opacity based on depth level.
 * Depth 0 (focused node) = 1.0, depth 1 = 0.85, depth 2 = 0.7, etc.
 */
function getDepthOpacity(depthLevel: number | undefined): number {
  if (depthLevel === undefined) return 1.0;
  if (depthLevel === 0) return 1.0;
  // Gradually decrease opacity for deeper nodes
  return Math.max(0.4, 1.0 - (depthLevel * 0.15));
}

/**
 * Calculate size multiplier based on depth level.
 * Depth 0 (focused node) gets a slight size boost.
 */
function getDepthSizeMultiplier(depthLevel: number | undefined): number {
  if (depthLevel === undefined) return 1.0;
  if (depthLevel === 0) return 1.3; // Focused node is larger
  return 1.0;
}

/**
 * Convert IGraphNode to Vis Network node format
 */
function toVisNode(node: IGraphNode, isFavorite: boolean, size: number = DEFAULT_NODE_SIZE, theme: ThemeKind = 'dark') {
  const isLight = theme === 'light';
  const nodeColor = isLight ? adjustColorForLightTheme(node.color) : node.color;
  const borderColor = isFavorite ? FAVORITE_BORDER_COLOR : nodeColor;
  const textColor = isLight ? '#1e1e1e' : '#e2e8f0';
  
  // Apply depth-based styling
  const depthOpacity = getDepthOpacity(node.depthLevel);
  const depthSizeMultiplier = getDepthSizeMultiplier(node.depthLevel);
  const adjustedSize = size * depthSizeMultiplier;
  
  // Apply special border for focused node (depth 0)
  const isFocusedNode = node.depthLevel === 0;
  const finalBorderColor = isFocusedNode 
    ? (isLight ? '#2563eb' : '#60a5fa') // Blue highlight for focused node
    : borderColor;
  const finalBorderWidth = isFocusedNode ? 4 : (isFavorite ? 3 : 2);
  
  return {
    id: node.id,
    label: node.label,
    size: adjustedSize,
    opacity: depthOpacity,
    color: {
      background: nodeColor,
      border: finalBorderColor,
      highlight: {
        background: nodeColor,
        border: isFavorite ? FAVORITE_BORDER_COLOR : (isLight ? '#000000' : '#ffffff'),
      },
      hover: {
        background: nodeColor,
        border: isFavorite ? FAVORITE_BORDER_COLOR : (isLight ? '#64748b' : '#94a3b8'),
      },
    },
    font: {
      color: textColor,
      size: 12,
    },
    borderWidth: finalBorderWidth,
    x: node.x,
    y: node.y,
  };
}

/** Edge with bidirectional info */
interface ProcessedEdge extends IGraphEdge {
  bidirectional?: boolean;
}

/**
 * Process edges to combine bidirectional ones if mode is 'combined'.
 * Returns processed edges with bidirectional flag.
 */
function processEdges(edges: IGraphEdge[], mode: BidirectionalEdgeMode): ProcessedEdge[] {
  if (mode === 'separate') {
    return edges.map(e => ({ ...e, bidirectional: false }));
  }

  // Build a set of edge keys for quick lookup
  const edgeSet = new Set(edges.map(e => `${e.from}->${e.to}`));
  const processed: ProcessedEdge[] = [];
  const seen = new Set<string>();

  for (const edge of edges) {
    const key = `${edge.from}->${edge.to}`;
    const reverseKey = `${edge.to}->${edge.from}`;

    if (seen.has(key) || seen.has(reverseKey)) {
      continue; // Already processed as part of a bidirectional pair
    }

    if (edgeSet.has(reverseKey)) {
      // This is a bidirectional connection - combine them
      // Use lexicographically smaller 'from' to ensure consistency
      const [nodeA, nodeB] = [edge.from, edge.to].sort();
      processed.push({
        id: `${nodeA}<->${nodeB}`,
        from: nodeA,
        to: nodeB,
        bidirectional: true,
      });
      seen.add(key);
      seen.add(reverseKey);
    } else {
      // Regular unidirectional edge
      processed.push({ ...edge, bidirectional: false });
      seen.add(key);
    }
  }

  return processed;
}

/**
 * Convert IGraphEdge to Vis Network edge format
 */
function toVisEdge(edge: ProcessedEdge) {
  const baseEdge = {
    id: edge.id,
    from: edge.from,
    to: edge.to,
  };

  if (edge.bidirectional) {
    // Bidirectional edge: arrows on both ends, different color
    return {
      ...baseEdge,
      arrows: {
        to: { enabled: true, scaleFactor: 0.5 },
        from: { enabled: true, scaleFactor: 0.5 },
      },
      color: {
        color: '#60a5fa', // Blue for bidirectional
        highlight: '#93c5fd',
        hover: '#93c5fd',
      },
      width: 2, // Thicker for visibility
    };
  }

  return baseEdge;
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
 * Export the graph as PNG and send to extension.
 */
function exportAsPng(network: Network): void {
  try {
    // Get the canvas from vis-network (access internal canvas via body)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const networkBody = network as any;
    const canvas = networkBody.body?.container?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      console.error('[CodeGraphy] No canvas found');
      return;
    }

    // Create a temporary canvas for export with background
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Fill with background color (dark to match graph)
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw the network canvas on top
    ctx.drawImage(canvas, 0, 0);

    // Convert to data URL
    const dataUrl = exportCanvas.toDataURL('image/png');
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `codegraphy-${timestamp}.png`;

    // Send to extension for saving
    postMessage({ type: 'EXPORT_PNG', payload: { dataUrl, filename } });
  } catch (error) {
    console.error('[CodeGraphy] Export failed:', error);
  }
}

/**
 * Export the graph as SVG and send to extension.
 * Recreates the graph visualization as vector graphics.
 */
function exportAsSvg(network: Network, nodes: DataSet<ReturnType<typeof toVisNode>>, edges: DataSet<ReturnType<typeof toVisEdge>>): void {
  try {
    // Get all node positions
    const nodeIds = nodes.getIds() as string[];
    const positions = network.getPositions(nodeIds);
    
    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const id of nodeIds) {
      const pos = positions[id];
      if (pos) {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x);
        maxY = Math.max(maxY, pos.y);
      }
    }
    
    // Add padding
    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Start building SVG
    const svgParts: string[] = [];
    svgParts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
    svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}">`);
    svgParts.push(`<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#18181b"/>`);
    
    // Add defs for arrow markers
    svgParts.push(`<defs>`);
    svgParts.push(`<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">`);
    svgParts.push(`<polygon points="0 0, 10 3.5, 0 7" fill="#71717a"/>`);
    svgParts.push(`</marker>`);
    svgParts.push(`</defs>`);
    
    // Draw edges
    const edgeItems = edges.get();
    for (const edge of edgeItems) {
      const fromPos = positions[edge.from as string];
      const toPos = positions[edge.to as string];
      if (fromPos && toPos) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const edgeAny = edge as any;
        const color = edgeAny.color?.color || '#71717a';
        svgParts.push(`<line x1="${fromPos.x}" y1="${fromPos.y}" x2="${toPos.x}" y2="${toPos.y}" stroke="${color}" stroke-width="1" marker-end="url(#arrowhead)"/>`);
      }
    }
    
    // Draw nodes
    const nodeItems = nodes.get();
    for (const node of nodeItems) {
      const pos = positions[node.id as string];
      if (pos) {
        const size = (node.size as number) || 16;
        const color = (node.color as { background?: string })?.background || '#3b82f6';
        const borderColor = (node.color as { border?: string })?.border || color;
        const label = (node.label as string) || '';
        
        // Draw node circle
        svgParts.push(`<circle cx="${pos.x}" cy="${pos.y}" r="${size}" fill="${color}" stroke="${borderColor}" stroke-width="2"/>`);
        
        // Draw label
        svgParts.push(`<text x="${pos.x}" y="${pos.y + size + 15}" text-anchor="middle" fill="#fafafa" font-size="12" font-family="sans-serif">${escapeXml(label)}</text>`);
      }
    }
    
    svgParts.push(`</svg>`);
    
    const svg = svgParts.join('\n');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `codegraphy-${timestamp}.svg`;
    
    postMessage({ type: 'EXPORT_SVG', payload: { svg, filename } });
  } catch (error) {
    console.error('[CodeGraphy] SVG export failed:', error);
  }
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Export the graph layout as JSON and send to extension.
 * Includes node positions, metadata, and edge information.
 */
function exportAsJson(network: Network, data: IGraphData): void {
  try {
    // Get all current positions from the network
    const nodeIds = data.nodes.map(n => n.id);
    const positions = network.getPositions(nodeIds);
    
    // Build export structure
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      nodes: data.nodes.map(node => ({
        id: node.id,
        label: node.label,
        color: node.color,
        fileSize: node.fileSize,
        accessCount: node.accessCount,
        position: positions[node.id] || { x: 0, y: 0 },
      })),
      edges: data.edges.map(edge => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
      })),
      metadata: {
        totalNodes: data.nodes.length,
        totalEdges: data.edges.length,
        nodeSizeMode: data.nodeSizeMode,
      },
    };
    
    const json = JSON.stringify(exportData, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `codegraphy-layout-${timestamp}.json`;
    
    postMessage({ type: 'EXPORT_JSON', payload: { json, filename } });
  } catch (error) {
    console.error('[CodeGraphy] JSON export failed:', error);
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

/**
 * Graph component with context menu and multi-select support.
 */
export default function Graph({ data, favorites = new Set(), theme = 'dark', bidirectionalMode = 'separate' }: GraphProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesRef = useRef<DataSet<ReturnType<typeof toVisNode>> | null>(null);
  const edgesRef = useRef<DataSet<ReturnType<typeof toVisEdge>> | null>(null);
  const initializedRef = useRef(false);
  const dataRef = useRef(data);
  const favoritesRef = useRef(favorites);
  const bidirectionalModeRef = useRef(bidirectionalMode);
  
  // Selection state
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [isBackgroundContext, setIsBackgroundContext] = useState(false);
  const selectedNodesRef = useRef(selectedNodes);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
  // Context menu target (set synchronously on right-click)
  const contextTargetRef = useRef<string[]>([]);
  
  // Tooltip state
  const [tooltipData, setTooltipData] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    path: string;
    info: IFileInfo | null;
  }>({ visible: false, position: { x: 0, y: 0 }, path: '', info: null });
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInfoCacheRef = useRef<Map<string, IFileInfo>>(new Map());

  const themeRef = useRef(theme);
  
  // Keep refs current
  dataRef.current = data;
  favoritesRef.current = favorites;
  bidirectionalModeRef.current = bidirectionalMode;
  selectedNodesRef.current = selectedNodes;
  themeRef.current = theme;

  /**
   * Handle context menu actions
   */
  const handleContextAction = useCallback((action: string, paths?: string[]) => {
    // Use contextTargetRef (set at click time) to avoid React state timing issues
    const targetPaths = paths || contextTargetRef.current;
    
    switch (action) {
      case 'open':
        targetPaths.forEach(path => {
          // Clear cache so visit count is refreshed on next hover
          fileInfoCacheRef.current.delete(path);
          postMessage({ type: 'OPEN_FILE', payload: { path } });
        });
        break;
        
      case 'reveal':
        if (targetPaths.length > 0) {
          postMessage({ type: 'REVEAL_IN_EXPLORER', payload: { path: targetPaths[0] } });
        }
        break;
        
      case 'copyRelative':
        postMessage({ type: 'COPY_TO_CLIPBOARD', payload: { text: targetPaths.join('\n') } });
        break;
        
      case 'copyAbsolute':
        // Extension will handle converting to absolute
        postMessage({ type: 'COPY_TO_CLIPBOARD', payload: { text: `absolute:${targetPaths[0]}` } });
        break;
        
      case 'toggleFavorite':
        postMessage({ type: 'TOGGLE_FAVORITE', payload: { paths: targetPaths } });
        break;
        
      case 'focus':
        if (networkRef.current && targetPaths.length > 0) {
          networkRef.current.focus(targetPaths[0], {
            scale: 1.5,
            animation: { duration: 300, easingFunction: 'easeInOutQuad' },
          });
        }
        break;
        
      case 'addToExclude':
        postMessage({ type: 'ADD_TO_EXCLUDE', payload: { patterns: targetPaths } });
        break;
        
      case 'rename':
        if (targetPaths.length > 0) {
          postMessage({ type: 'RENAME_FILE', payload: { path: targetPaths[0] } });
        }
        break;
        
      case 'delete':
        postMessage({ type: 'DELETE_FILES', payload: { paths: targetPaths } });
        break;
        
      case 'refresh':
        postMessage({ type: 'REFRESH_GRAPH' });
        break;
        
      case 'fitView':
        networkRef.current?.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } });
        break;
        
      case 'createFile':
        postMessage({ type: 'CREATE_FILE', payload: { directory: '.' } });
        break;
    }
  }, []); // contextTargetRef is stable, no deps needed

  /**
   * Listen for commands from the extension
   */
  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      const network = networkRef.current;
      if (!network) return;

      const message = event.data;
      switch (message.type) {
        case 'FIT_VIEW':
          network.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } });
          break;
        case 'ZOOM_IN': {
          const scaleIn = network.getScale();
          network.moveTo({ scale: scaleIn * 1.2, animation: { duration: 150, easingFunction: 'easeInOutQuad' } });
          break;
        }
        case 'ZOOM_OUT': {
          const scaleOut = network.getScale();
          network.moveTo({ scale: scaleOut / 1.2, animation: { duration: 150, easingFunction: 'easeInOutQuad' } });
          break;
        }
        case 'FAVORITES_UPDATED':
          // Will be handled by parent component
          break;
        case 'FILE_INFO':
          // Cache and update tooltip
          fileInfoCacheRef.current.set(message.payload.path, message.payload);
          setTooltipData(prev => {
            if (prev.path === message.payload.path) {
              return { ...prev, info: message.payload };
            }
            return prev;
          });
          break;
        case 'REQUEST_EXPORT_PNG':
          exportAsPng(network);
          break;
        case 'REQUEST_EXPORT_SVG':
          if (nodesRef.current && edgesRef.current) {
            exportAsSvg(network, nodesRef.current, edgesRef.current);
          }
          break;
        case 'REQUEST_EXPORT_JSON':
          exportAsJson(network, dataRef.current);
          break;
        case 'NODE_ACCESS_COUNT_UPDATED': {
          // Update node's access count and recalculate sizes in real-time
          const { nodeId, accessCount } = message.payload;
          const currentData = dataRef.current;
          
          // Update the node's accessCount in our data reference
          const nodeIndex = currentData.nodes.findIndex(n => n.id === nodeId);
          if (nodeIndex !== -1) {
            currentData.nodes[nodeIndex].accessCount = accessCount;
            
            // Only recalculate if we're in access-count mode
            if (currentData.nodeSizeMode === 'access-count' && nodesRef.current) {
              // Recalculate all node sizes (normalization may change)
              const nodeSizes = calculateNodeSizes(
                currentData.nodes,
                currentData.edges,
                'access-count'
              );
              
              // Update all nodes with new sizes
              currentData.nodes.forEach((node) => {
                const visNode = toVisNode(
                  node, 
                  favoritesRef.current.has(node.id), 
                  nodeSizes.get(node.id), 
                  themeRef.current
                );
                nodesRef.current?.update(visNode);
              });
            }
          }
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const network = networkRef.current;
      if (!network) return;

      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMod = event.ctrlKey || event.metaKey;

      switch (event.key) {
        case '0':
          event.preventDefault();
          network.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } });
          break;

        case 'Escape':
          event.preventDefault();
          network.unselectAll();
          setSelectedNodes([]);
          break;

        case 'Enter':
          if (selectedNodes.length > 0) {
            event.preventDefault();
            selectedNodes.forEach(nodeId => {
              // Clear cache so visit count is refreshed on next hover
              fileInfoCacheRef.current.delete(nodeId);
              postMessage({ type: 'NODE_DOUBLE_CLICKED', payload: { nodeId } });
            });
          }
          break;

        case 'a':
          if (isMod) {
            event.preventDefault();
            const allIds = nodesRef.current?.getIds() as string[] || [];
            network.selectNodes(allIds);
            setSelectedNodes(allIds);
          }
          break;

        case '=':
        case '+':
          if (!isMod) {
            event.preventDefault();
            const scale = network.getScale();
            network.moveTo({ scale: scale * 1.2, animation: { duration: 150, easingFunction: 'easeInOutQuad' } });
          }
          break;

        case '-':
          if (!isMod) {
            event.preventDefault();
            const scale = network.getScale();
            network.moveTo({ scale: scale / 1.2, animation: { duration: 150, easingFunction: 'easeInOutQuad' } });
          }
          break;

        case 'z':
        case 'Z':
          if (isMod) {
            event.preventDefault();
            event.stopPropagation();
            if (event.shiftKey) {
              // Ctrl+Shift+Z = Redo
              postMessage({ type: 'REDO' });
            } else {
              // Ctrl+Z = Undo
              postMessage({ type: 'UNDO' });
            }
          }
          break;

        case 'y':
        case 'Y':
          if (isMod) {
            // Ctrl+Y = Redo (Windows convention)
            event.preventDefault();
            event.stopPropagation();
            postMessage({ type: 'REDO' });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodes]);

  /**
   * Initialize network once
   */
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;

    const initialData = dataRef.current;
    const currentFavorites = favoritesRef.current;
    const currentMode = bidirectionalModeRef.current;

    // Calculate node sizes based on sizing mode
    const nodeSizes = calculateNodeSizes(
      initialData.nodes,
      initialData.edges,
      initialData.nodeSizeMode ?? 'connections'
    );

    // Create datasets
    const nodes = new DataSet(initialData.nodes.map(n => 
      toVisNode(n, currentFavorites.has(n.id), nodeSizes.get(n.id), themeRef.current)
    ));
    const processedEdges = processEdges(initialData.edges, currentMode);
    const edges = new DataSet(processedEdges.map(toVisEdge));

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

    // Save positions after physics stabilization
    network.on('stabilized', () => {
      sendAllPositions(network, nodes.getIds() as string[]);
    });

    // Handle selection changes
    network.on('select', (params) => {
      setSelectedNodes(params.nodes as string[]);
    });

    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0] as string;
        postMessage({ type: 'NODE_SELECTED', payload: { nodeId } });
      }
    });

    network.on('doubleClick', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0] as string;
        // Clear cache so visit count is refreshed on next hover
        fileInfoCacheRef.current.delete(nodeId);
        postMessage({ type: 'NODE_DOUBLE_CLICKED', payload: { nodeId } });
      }
    });

    // Note: Context menu logic is handled by onContextMenu on the container div
    // This fires before Radix opens the menu, fixing the timing issue where
    // first Ctrl+click showed background menu instead of node menu.

    // Handle hover for highlighting connected nodes and tooltips
    network.on('hoverNode', (params) => {
      const nodeId = params.node as string;
      setHoveredNode(nodeId);
      
      // Show tooltip after delay
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
      
      tooltipTimeoutRef.current = setTimeout(() => {
        const position = params.event.center || { x: params.event.clientX || 0, y: params.event.clientY || 0 };
        
        // Check cache first
        const cached = fileInfoCacheRef.current.get(nodeId);
        
        setTooltipData({
          visible: true,
          position: { x: position.x, y: position.y },
          path: nodeId,
          info: cached || null,
        });
        
        // Request file info if not cached
        if (!cached) {
          postMessage({ type: 'GET_FILE_INFO', payload: { path: nodeId } });
        }
      }, 500); // 500ms delay before showing tooltip
    });

    network.on('blurNode', () => {
      setHoveredNode(null);
      
      // Clear tooltip timeout and hide
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
        tooltipTimeoutRef.current = null;
      }
      setTooltipData(prev => ({ ...prev, visible: false }));
    });

    // Notify extension that webview is ready
    postMessage({ type: 'WEBVIEW_READY', payload: null });

    return () => {
      network.destroy();
      networkRef.current = null;
      nodesRef.current = null;
      edgesRef.current = null;
      initializedRef.current = false;
    };
  }, []);

  /**
   * Update data when props change
   */
  useEffect(() => {
    if (!initializedRef.current || !nodesRef.current || !edgesRef.current) return;

    const currentFavorites = favoritesRef.current;

    // Calculate node sizes for the updated data
    const nodeSizes = calculateNodeSizes(
      data.nodes,
      data.edges,
      data.nodeSizeMode ?? 'connections'
    );

    // Update nodes
    const currentNodeIds = new Set(nodesRef.current.getIds());
    const newNodeIds = new Set(data.nodes.map((n) => n.id));

    currentNodeIds.forEach((id) => {
      if (!newNodeIds.has(id as string)) {
        nodesRef.current?.remove(id);
      }
    });

    data.nodes.forEach((node) => {
      const visNode = toVisNode(node, currentFavorites.has(node.id), nodeSizes.get(node.id), themeRef.current);
      if (currentNodeIds.has(node.id)) {
        nodesRef.current?.update(visNode);
      } else {
        nodesRef.current?.add(visNode);
      }
    });

    // Update edges (with bidirectional processing)
    const processedEdges = processEdges(data.edges, bidirectionalModeRef.current);
    const currentEdgeIds = new Set(edgesRef.current.getIds());
    const newEdgeIds = new Set(processedEdges.map((e) => e.id));

    currentEdgeIds.forEach((id) => {
      if (!newEdgeIds.has(id as string)) {
        edgesRef.current?.remove(id);
      }
    });

    processedEdges.forEach((edge) => {
      if (currentEdgeIds.has(edge.id)) {
        edgesRef.current?.update(toVisEdge(edge));
      } else {
        edgesRef.current?.add(toVisEdge(edge));
      }
    });
  }, [data]);

  /**
   * Update node styling when favorites change
   */
  useEffect(() => {
    if (!nodesRef.current) return;
    
    // Recalculate sizes to maintain consistency
    const nodeSizes = calculateNodeSizes(
      data.nodes,
      data.edges,
      data.nodeSizeMode ?? 'connections'
    );
    
    data.nodes.forEach((node) => {
      const visNode = toVisNode(node, favorites.has(node.id), nodeSizes.get(node.id), theme);
      nodesRef.current?.update(visNode);
    });
  }, [favorites, data.nodes, data.edges, data.nodeSizeMode, theme]);

  /**
   * Handle hover highlighting - dim unconnected nodes
   */
  useEffect(() => {
    if (!nodesRef.current || !edgesRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodesDataSet = nodesRef.current as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const edgesDataSet = edgesRef.current as any;

    if (hoveredNode) {
      // Find connected nodes
      const connectedNodeIds = new Set<string>([hoveredNode]);
      
      data.edges.forEach((edge) => {
        if (edge.from === hoveredNode) {
          connectedNodeIds.add(edge.to);
        }
        if (edge.to === hoveredNode) {
          connectedNodeIds.add(edge.from);
        }
      });

      // Theme-aware colors
      const isLight = themeRef.current === 'light';
      const activeTextColor = isLight ? '#1e1e1e' : '#e2e8f0';
      const dimTextColor = isLight ? '#9ca3af' : '#4a5568';
      const highlightBorder = isLight ? '#000000' : '#ffffff';
      const hoverBorder = isLight ? '#64748b' : '#94a3b8';
      const dimEdgeColor = isLight ? '#d4d4d4' : '#2d3748';

      // Update node opacity
      data.nodes.forEach((node) => {
        const isConnected = connectedNodeIds.has(node.id);
        const isFavorite = favorites.has(node.id);
        const nodeColor = isLight ? adjustColorForLightTheme(node.color) : node.color;
        
        nodesDataSet.update({
          id: node.id,
          opacity: isConnected ? 1.0 : 0.2,
          font: {
            color: isConnected ? activeTextColor : dimTextColor,
            size: 12,
          },
          color: {
            background: nodeColor,
            border: isFavorite ? FAVORITE_BORDER_COLOR : nodeColor,
            highlight: {
              background: nodeColor,
              border: isFavorite ? FAVORITE_BORDER_COLOR : highlightBorder,
            },
            hover: {
              background: nodeColor,
              border: isFavorite ? FAVORITE_BORDER_COLOR : hoverBorder,
            },
          },
        });
      });

      // Update edge opacity
      data.edges.forEach((edge) => {
        const isConnected = edge.from === hoveredNode || edge.to === hoveredNode;
        edgesDataSet.update({
          id: edge.id,
          color: {
            color: isConnected ? '#60a5fa' : dimEdgeColor,
            highlight: '#60a5fa',
            hover: '#60a5fa',
          },
          width: isConnected ? 2 : 1,
        });
      });
    } else {
      // Reset all nodes and edges to normal
      const isLight = themeRef.current === 'light';
      const textColor = isLight ? '#1e1e1e' : '#e2e8f0';
      const edgeColor = isLight ? '#94a3b8' : '#475569';
      
      // Recalculate sizes for reset
      const nodeSizes = calculateNodeSizes(
        data.nodes,
        data.edges,
        data.nodeSizeMode ?? 'connections'
      );
      
      data.nodes.forEach((node) => {
        const visNode = toVisNode(node, favorites.has(node.id), nodeSizes.get(node.id), themeRef.current);
        nodesDataSet.update({
          ...visNode,
          opacity: 1.0,
          font: { color: textColor, size: 12 },
        });
      });

      data.edges.forEach((edge) => {
        edgesDataSet.update({
          id: edge.id,
          color: {
            color: edgeColor,
            highlight: '#60a5fa',
            hover: '#60a5fa',
          },
          width: 1,
        });
      });
    }
  }, [hoveredNode, data, favorites, theme]);

  /**
   * Update edges when bidirectional mode changes
   */
  useEffect(() => {
    if (!edgesRef.current || !initializedRef.current) return;

    // Clear and rebuild edges with new mode
    const processedEdges = processEdges(data.edges, bidirectionalMode);
    // Use remove + add instead of clear (which may not be available in all DataSet versions)
    const currentIds = edgesRef.current.getIds();
    if (currentIds.length > 0) {
      edgesRef.current.remove(currentIds);
    }
    edgesRef.current.add(processedEdges.map(toVisEdge));
  }, [bidirectionalMode, data.edges]);

  /**
   * Handle context menu trigger - captures node BEFORE Radix opens menu
   * 
   * Both right-click and Ctrl+click should behave the same way:
   * - Context menu is based on what's under the mouse, NOT what's selected
   * - Node under mouse → node menu for that node
   * - Background → background menu
   * - No multi-select via Ctrl+click (use Shift+click/drag for that)
   */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const network = networkRef.current;
    const container = containerRef.current;
    if (!network || !container) return;

    // Hide tooltip when opening context menu
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setTooltipData(prev => ({ ...prev, visible: false }));

    // Get pointer position relative to the container
    const rect = container.getBoundingClientRect();
    const domPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const nodeId = network.getNodeAt(domPoint) as string | undefined;

    // Both right-click and Ctrl+click behave the same:
    // Menu is based on what's under the mouse
    if (nodeId) {
      // Clicked on a node - show node menu for this specific node
      if (!selectedNodesRef.current.includes(nodeId)) {
        // Node not in selection: select just this one
        network.selectNodes([nodeId]);
        setSelectedNodes([nodeId]);
        contextTargetRef.current = [nodeId];
      } else {
        // Node already selected: use current selection
        contextTargetRef.current = [...selectedNodesRef.current];
      }
      setIsBackgroundContext(false);
    } else {
      // Clicked on background - show background menu
      contextTargetRef.current = [];
      setIsBackgroundContext(true);
    }
  }, []);

  // Use contextTargetRef for menu display (set synchronously on right-click)
  // For node menus, use the context target (what's under the mouse)
  // For background menus, contextTargetRef is empty and that's correct
  const menuTargets = contextTargetRef.current;
  const isMultiSelect = menuTargets.length > 1;
  const allFavorited = menuTargets.length > 0 && menuTargets.every(id => favorites.has(id));

  const isLight = theme === 'light';
  const bgColor = isLight ? '#f5f5f5' : '#18181b';
  const borderColor = isLight ? '#d4d4d4' : 'rgb(63, 63, 70)'; // zinc-700
  
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={containerRef}
          onContextMenu={handleContextMenu}
          className="graph-container absolute inset-0 rounded-lg m-1 outline-none focus:outline-none"
          style={{ backgroundColor: bgColor, borderWidth: 1, borderStyle: 'solid', borderColor }}
          tabIndex={0}
        />
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-64">
        {isBackgroundContext ? (
          // Background context menu
          <>
            <ContextMenuItem onClick={() => handleContextAction('createFile')}>
              New File...
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => handleContextAction('refresh')}>
              Refresh Graph
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleContextAction('fitView')}>
              Fit All Nodes
              <ContextMenuShortcut>0</ContextMenuShortcut>
            </ContextMenuItem>
          </>
        ) : (
          // Node context menu
          <>
            <ContextMenuItem onClick={() => handleContextAction('open')}>
              {isMultiSelect ? `Open ${menuTargets.length} Files` : 'Open File'}
            </ContextMenuItem>
            
            {!isMultiSelect && (
              <ContextMenuItem onClick={() => handleContextAction('reveal')}>
                Reveal in Explorer
              </ContextMenuItem>
            )}

            <ContextMenuSeparator />

            <ContextMenuItem onClick={() => handleContextAction('copyRelative')}>
              {isMultiSelect ? 'Copy Relative Paths' : 'Copy Relative Path'}
            </ContextMenuItem>
            
            {!isMultiSelect && (
              <ContextMenuItem onClick={() => handleContextAction('copyAbsolute')}>
                Copy Absolute Path
              </ContextMenuItem>
            )}

            <ContextMenuSeparator />

            <ContextMenuItem onClick={() => handleContextAction('toggleFavorite')}>
              {allFavorited
                ? (isMultiSelect ? 'Remove All from Favorites' : 'Remove from Favorites')
                : (isMultiSelect ? 'Add All to Favorites' : 'Add to Favorites')
              }
            </ContextMenuItem>

            {!isMultiSelect && (
              <ContextMenuItem onClick={() => handleContextAction('focus')}>
                Focus Node
              </ContextMenuItem>
            )}

            <ContextMenuSeparator />

            <ContextMenuItem onClick={() => handleContextAction('addToExclude')}>
              {isMultiSelect ? 'Add All to Exclude' : 'Add to Exclude'}
            </ContextMenuItem>

            <ContextMenuSeparator />

            {!isMultiSelect && (
              <ContextMenuItem onClick={() => handleContextAction('rename')}>
                Rename...
              </ContextMenuItem>
            )}
            
            <ContextMenuItem 
              className="text-red-400 focus:text-red-300"
              onClick={() => handleContextAction('delete')}
            >
              {isMultiSelect ? `Delete ${menuTargets.length} Files` : 'Delete File'}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
      
      {/* Tooltip */}
      <NodeTooltip
        path={tooltipData.path}
        size={tooltipData.info?.size}
        lastModified={tooltipData.info?.lastModified}
        incomingCount={tooltipData.info?.incomingCount ?? 0}
        outgoingCount={tooltipData.info?.outgoingCount ?? 0}
        plugin={tooltipData.info?.plugin}
        visits={tooltipData.info?.visits}
        position={tooltipData.position}
        visible={tooltipData.visible}
      />
    </ContextMenu>
  );
}
