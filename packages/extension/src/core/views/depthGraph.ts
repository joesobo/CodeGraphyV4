/**
 * @fileoverview Depth Graph view — focuses on a specific file and its neighbors.
 * @module core/views/depthGraph
 */

import { IView, IViewContext } from './types';
import { IGraphData } from '../../shared/types';
import { buildAdjacencyList, bfsFromNode } from './depthTraversal';

export const depthGraphView: IView = {
  id: 'codegraphy.depth-graph',
  name: 'Depth Graph',
  icon: 'target',
  description: 'Focus on current file and its connections up to N levels deep',

  transform(data: IGraphData, context: IViewContext): IGraphData {
    const focusedFile = context.focusedFile ?? '';
    const adjacencyList = buildAdjacencyList(data);
    const nodeDepths = bfsFromNode(focusedFile, context.depthLimit ?? 1, adjacencyList);

    const filteredNodes = data.nodes
      .filter(node => nodeDepths.has(node.id))
      .map(node => ({ ...node, depthLevel: nodeDepths.get(node.id) }));

    const includedNodeIds = new Set(nodeDepths.keys());
    const filteredEdges = data.edges.filter(
      edge => includedNodeIds.has(edge.from) && includedNodeIds.has(edge.to)
    );

    return { nodes: filteredNodes, edges: filteredEdges };
  },

  isAvailable(context: IViewContext): boolean {
    return context.focusedFile !== undefined;
  },
};
