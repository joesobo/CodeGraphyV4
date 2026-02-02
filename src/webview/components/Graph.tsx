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
  WebviewToExtensionMessage,
  ExtensionToWebviewMessage,
} from '../../shared/types';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from './ui/context-menu';

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

/**
 * Convert IGraphNode to Vis Network node format
 */
function toVisNode(node: IGraphNode, isFavorite: boolean) {
  const borderColor = isFavorite ? FAVORITE_BORDER_COLOR : node.color;
  return {
    id: node.id,
    label: node.label,
    color: {
      background: node.color,
      border: borderColor,
      highlight: {
        background: node.color,
        border: isFavorite ? FAVORITE_BORDER_COLOR : '#ffffff',
      },
      hover: {
        background: node.color,
        border: isFavorite ? FAVORITE_BORDER_COLOR : '#94a3b8',
      },
    },
    borderWidth: isFavorite ? 3 : 2,
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

/**
 * Graph component with context menu and multi-select support.
 */
export default function Graph({ data, favorites = new Set() }: GraphProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesRef = useRef<DataSet<ReturnType<typeof toVisNode>> | null>(null);
  const edgesRef = useRef<DataSet<ReturnType<typeof toVisEdge>> | null>(null);
  const initializedRef = useRef(false);
  const dataRef = useRef(data);
  const favoritesRef = useRef(favorites);
  
  // Selection state
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [isBackgroundContext, setIsBackgroundContext] = useState(false);
  const selectedNodesRef = useRef(selectedNodes);
  
  // Context menu target (set synchronously on right-click)
  const contextTargetRef = useRef<string[]>([]);

  // Keep refs current
  dataRef.current = data;
  favoritesRef.current = favorites;
  selectedNodesRef.current = selectedNodes;

  /**
   * Handle context menu actions
   */
  const handleContextAction = useCallback((action: string, paths?: string[]) => {
    // Use contextTargetRef (set at click time) to avoid React state timing issues
    const targetPaths = paths || contextTargetRef.current;
    
    switch (action) {
      case 'open':
        targetPaths.forEach(path => {
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

    // Create datasets
    const nodes = new DataSet(initialData.nodes.map(n => toVisNode(n, currentFavorites.has(n.id))));
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
        postMessage({ type: 'NODE_DOUBLE_CLICKED', payload: { nodeId } });
      }
    });

    // Note: Context menu logic is handled by onContextMenu on the container div
    // This fires before Radix opens the menu, fixing the timing issue where
    // first Ctrl+click showed background menu instead of node menu.

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

    // Update nodes
    const currentNodeIds = new Set(nodesRef.current.getIds());
    const newNodeIds = new Set(data.nodes.map((n) => n.id));

    currentNodeIds.forEach((id) => {
      if (!newNodeIds.has(id as string)) {
        nodesRef.current?.remove(id);
      }
    });

    data.nodes.forEach((node) => {
      const visNode = toVisNode(node, currentFavorites.has(node.id));
      if (currentNodeIds.has(node.id)) {
        nodesRef.current?.update(visNode);
      } else {
        nodesRef.current?.add(visNode);
      }
    });

    // Update edges
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

  /**
   * Update node styling when favorites change
   */
  useEffect(() => {
    if (!nodesRef.current) return;
    
    data.nodes.forEach((node) => {
      const visNode = toVisNode(node, favorites.has(node.id));
      nodesRef.current?.update(visNode);
    });
  }, [favorites, data.nodes]);

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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={containerRef}
          onContextMenu={handleContextMenu}
          className="graph-container absolute inset-0 rounded-lg border border-zinc-700 m-1 outline-none focus:outline-none"
          style={{ backgroundColor: '#18181b' }}
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
    </ContextMenu>
  );
}
