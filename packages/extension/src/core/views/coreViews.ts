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
    };
  },
  
  isAvailable(context: IViewContext): boolean {
    // Only available when a file is focused
    return context.focusedFile !== undefined;
  },
};

/**
 * Folder View - shows the folder containment hierarchy.
 * Replaces import edges with parent→child containment edges,
 * creating folder nodes for every directory level.
 *
 * Root-level files (no `/` in id) get a synthetic `(root)` folder parent.
 */
export const folderView: IView = {
  id: 'codegraphy.folder',
  name: 'Folder',
  icon: 'folder',
  description: 'Shows the folder containment hierarchy',

  transform(data: IGraphData, _context: IViewContext): IGraphData {
    if (data.nodes.length === 0) {
      return { nodes: [], edges: [] };
    }

    // Collect all unique folder paths from file node ids
    const folderPaths = new Set<string>();

    for (const node of data.nodes) {
      const segments = node.id.split('/');
      // Build every ancestor path: a, a/b, a/b/c, ...
      if (segments.length > 1) {
        for (let i = 1; i < segments.length; i++) {
          folderPaths.add(segments.slice(0, i).join('/'));
        }
      }
      // Root-level files (no `/`) will be handled below
    }

    // Determine whether we need a (root) synthetic folder
    const hasRootFiles = data.nodes.some(n => !n.id.includes('/'));
    if (hasRootFiles) {
      folderPaths.add('(root)');
    }

    // Create folder nodes
    const folderNodes = Array.from(folderPaths).map(fp => ({
      id: fp,
      label: fp === '(root)' ? '(root)' : fp.split('/').pop()!,
      color: '#A1A1AA',
      nodeType: 'folder' as const,
    }));

    // Annotate file nodes with nodeType: 'file', preserving all original properties
    const fileNodes = data.nodes.map(n => ({
      ...n,
      nodeType: 'file' as const,
    }));

    // Build containment edges
    const edges: IGraphData['edges'] = [];

    // Folder → subfolder edges
    for (const fp of folderPaths) {
      if (fp === '(root)') continue;
      const segments = fp.split('/');
      if (segments.length === 1) {
        // top-level folder has no parent folder (unless we wanted (root)→folder, but spec says root is only for root-level files)
      } else {
        const parent = segments.slice(0, -1).join('/');
        edges.push({ id: `${parent}->${fp}`, from: parent, to: fp });
      }
    }

    // Folder → file edges
    for (const node of data.nodes) {
      const segments = node.id.split('/');
      if (segments.length === 1) {
        // Root-level file → parent is (root)
        edges.push({ id: `(root)->${node.id}`, from: '(root)', to: node.id });
      } else {
        const parent = segments.slice(0, -1).join('/');
        edges.push({ id: `${parent}->${node.id}`, from: parent, to: node.id });
      }
    }

    return {
      nodes: [...folderNodes, ...fileNodes],
      edges,
    };
  },
};

/**
 * All core views that ship with CodeGraphy.
 * Register these on startup.
 */
export const coreViews: IView[] = [
  connectionsView,
  depthGraphView,
  folderView,
];
