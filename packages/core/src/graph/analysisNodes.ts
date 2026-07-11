import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { DEFAULT_NODE_COLOR } from '../fileColors';
import type { IGraphEdge, IGraphNode } from './contracts';
import { createContainsEdge } from './symbolNodes';
import { toRepoRelativeGraphPath } from './symbolPaths';

interface AnalysisNodeGraph {
  containingFileIds: Set<string>;
  edges: IGraphEdge[];
  nodes: IGraphNode[];
}

export function buildAnalysisNodesAndEdges(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  workspaceRoot: string,
): AnalysisNodeGraph {
  const containingFileIds = new Set<string>();
  const edgesById = new Map<string, IGraphEdge>();
  const nodesById = new Map<string, IGraphNode>();

  for (const [analysisFilePath, analysis] of fileAnalysis) {
    const containingFileId = toRepoRelativeGraphPath(analysis.filePath || analysisFilePath, workspaceRoot);
    for (const node of analysis.nodes ?? []) {
      nodesById.set(node.id, {
        id: node.id,
        label: node.label,
        color: DEFAULT_NODE_COLOR,
        nodeType: node.nodeType,
        ...(node.metadata ? { metadata: { ...node.metadata } } : {}),
      });

      const parentId = node.parentId
        ? toRepoRelativeGraphPath(node.parentId, workspaceRoot)
        : containingFileId;
      const edge = createContainsEdge(parentId, node.id);
      edgesById.set(edge.id, edge);
      containingFileIds.add(toRepoRelativeGraphPath(node.filePath ?? analysis.filePath, workspaceRoot));
    }
  }

  return {
    containingFileIds,
    edges: [...edgesById.values()],
    nodes: [...nodesById.values()],
  };
}
