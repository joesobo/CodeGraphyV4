/**
 * @fileoverview Core views that ship with CodeGraphy.
 * These views are always available regardless of which plugins are active.
 * @module core/views/coreViews
 */

import { IView, IViewContext } from './types';
import { IGraphData } from '../../shared/types';

/**
 * Connections view - the default view.
 * Shows all files and their import relationships.
 * This is the current default behavior of CodeGraphy.
 */
export const connectionsView: IView = {
  id: 'codegraphy.connections',
  name: 'Connections',
  icon: 'symbol-file',
  description: 'Shows all files and their import relationships',
  
  transform(data: IGraphData, _context: IViewContext): IGraphData {
    // Pass through - this is the default view that shows everything
    return data;
  },
};

/**
 * Depth Graph view - focuses on a specific file.
 * Shows the selected file and connections radiating outward up to N levels deep.
 * 
 * Uses BFS traversal to find all nodes within the depth limit.
 * Nodes are annotated with their depth level for visual styling.
 */
export const depthGraphView: IView = {
  id: 'codegraphy.depth-graph',
  name: 'Depth Graph',
  icon: 'target',
  description: 'Focus on current file and its connections up to N levels deep',
  
  transform(data: IGraphData, context: IViewContext): IGraphData {
    // If no file is focused, return empty graph
    if (!context.focusedFile) {
      return { nodes: [], edges: [] };
    }
    
    const focusedFile = context.focusedFile;
    const depthLimit = context.depthLimit ?? 1;
    
    // Build adjacency list for both directions (imports and imported-by)
    const adjacencyList = new Map<string, Set<string>>();
    
    for (const node of data.nodes) {
      adjacencyList.set(node.id, new Set());
    }
    
    for (const edge of data.edges) {
      // Add both directions for undirected traversal
      adjacencyList.get(edge.from)?.add(edge.to);
      adjacencyList.get(edge.to)?.add(edge.from);
    }
    
    // BFS to find all nodes within depth limit
    const nodeDepths = new Map<string, number>();
    const queue: Array<{ nodeId: string; depth: number }> = [];
    
    // Start from the focused file
    if (adjacencyList.has(focusedFile)) {
      nodeDepths.set(focusedFile, 0);
      queue.push({ nodeId: focusedFile, depth: 0 });
    }
    
    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;
      
      // Don't explore beyond depth limit
      if (depth >= depthLimit) continue;
      
      const neighbors = adjacencyList.get(nodeId);
      if (!neighbors) continue;
      
      for (const neighbor of neighbors) {
        if (!nodeDepths.has(neighbor)) {
          nodeDepths.set(neighbor, depth + 1);
          queue.push({ nodeId: neighbor, depth: depth + 1 });
        }
      }
    }
    
    // Filter nodes and annotate with depth level
    const filteredNodes = data.nodes
      .filter(node => nodeDepths.has(node.id))
      .map(node => ({
        ...node,
        depthLevel: nodeDepths.get(node.id),
      }));
    
    // Filter edges to only include those between included nodes
    const includedNodeIds = new Set(nodeDepths.keys());
    const filteredEdges = data.edges.filter(
      edge => includedNodeIds.has(edge.from) && includedNodeIds.has(edge.to)
    );
    
    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      nodeSizeMode: data.nodeSizeMode,
    };
  },
  
  isAvailable(context: IViewContext): boolean {
    // Only available when a file is focused
    return context.focusedFile !== undefined;
  },
};

/**
 * Subfolder View - limits the graph to a specific folder.
 * Shows only files within the selected folder and its subfolders.
 * 
 * This is a placeholder implementation.
 */
export const subfolderView: IView = {
  id: 'codegraphy.subfolder',
  name: 'Subfolder View',
  icon: 'folder',
  description: 'Limit view to files in a specific folder',
  
  transform(data: IGraphData, context: IViewContext): IGraphData {
    // If no folder is selected, return everything
    if (!context.selectedFolder) {
      return data;
    }
    
    const folderPrefix = context.selectedFolder.endsWith('/')
      ? context.selectedFolder
      : `${context.selectedFolder}/`;
    
    // Filter nodes to only include those in the folder
    const filteredNodes = data.nodes.filter(
      node => node.id.startsWith(folderPrefix) || node.id === context.selectedFolder
    );
    
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    
    // Filter edges to only include those between filtered nodes
    const filteredEdges = data.edges.filter(
      edge => nodeIds.has(edge.from) && nodeIds.has(edge.to)
    );
    
    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      nodeSizeMode: data.nodeSizeMode,
    };
  },
  
  isAvailable(context: IViewContext): boolean {
    // Only available when a folder is selected
    return context.selectedFolder !== undefined;
  },
};

/**
 * All core views that ship with CodeGraphy.
 * Register these on startup.
 */
export const coreViews: IView[] = [
  connectionsView,
  depthGraphView,
  subfolderView,
];
