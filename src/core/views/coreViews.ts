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
 * Shows the selected file and its direct dependencies (1-hop connections).
 * 
 * This is a placeholder implementation. Full implementation will be in #62.
 * Currently shows the focused file and its immediate neighbors.
 */
export const depthGraphView: IView = {
  id: 'codegraphy.depth-graph',
  name: 'Depth Graph',
  icon: 'target',
  description: 'Focus on current file and its immediate connections',
  
  transform(data: IGraphData, context: IViewContext): IGraphData {
    // If no file is focused, return empty graph with a message
    if (!context.focusedFile) {
      return { nodes: [], edges: [] };
    }
    
    const focusedFile = context.focusedFile;
    
    // Find all nodes connected to the focused file (1-hop)
    const connectedNodeIds = new Set<string>([focusedFile]);
    
    for (const edge of data.edges) {
      if (edge.from === focusedFile) {
        connectedNodeIds.add(edge.to);
      }
      if (edge.to === focusedFile) {
        connectedNodeIds.add(edge.from);
      }
    }
    
    // Filter nodes to only include connected ones
    const filteredNodes = data.nodes.filter(node => connectedNodeIds.has(node.id));
    
    // Filter edges to only include those between connected nodes
    const filteredEdges = data.edges.filter(
      edge => connectedNodeIds.has(edge.from) && connectedNodeIds.has(edge.to)
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
