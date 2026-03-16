/**
 * @fileoverview Depth Graph view — focuses on a specific file and its neighbors.
 * @module core/views/depthGraph
 */

import { IView, IViewContext } from './types';
import { IGraphData } from '../../shared/types';

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
