/**
 * @fileoverview Node-building helpers for workspace graph data.
 * @module extension/workspaceGraphNodes
 */

import * as path from 'path';
import { DEFAULT_NODE_COLOR } from '../../../shared/fileColors';
import type { IGraphNode } from '../../../shared/graph/types';

export interface IWorkspaceGraphNodesOptions {
  cacheFiles: Record<string, { size?: number }>;
  connectedIds: ReadonlySet<string>;
  nodeIds: ReadonlySet<string>;
  showOrphans: boolean;
  visitCounts: Record<string, number>;
}

export function buildWorkspaceGraphNodes(
  options: IWorkspaceGraphNodesOptions,
): IGraphNode[] {
  const {
    cacheFiles,
    connectedIds,
    nodeIds,
    showOrphans,
    visitCounts,
  } = options;

  const nodes: IGraphNode[] = [];

  for (const filePath of nodeIds) {
    if (!showOrphans && !connectedIds.has(filePath)) {
      continue;
    }

    nodes.push({
      id: filePath,
      label: path.basename(filePath),
      color: DEFAULT_NODE_COLOR,
      fileSize: cacheFiles[filePath]?.size,
      accessCount: visitCounts[filePath] ?? 0,
    });
  }

  return nodes;
}
