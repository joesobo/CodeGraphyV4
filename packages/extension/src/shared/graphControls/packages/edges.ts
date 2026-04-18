import type { IGraphData } from '../../graph/contracts';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../defaults/definitions';
import { getNearestWorkspacePackageRoot } from './roots';
import { getWorkspacePackageNodeId, isFileNode } from './workspace';

export function buildWorkspacePackageEdges(
  packageRoots: ReadonlySet<string>,
  nodes: IGraphData['nodes'],
): IGraphData['edges'] {
  const edges: IGraphData['edges'] = [];

  for (const node of nodes) {
    if (!isFileNode(node)) {
      continue;
    }

    const packageRoot = getNearestWorkspacePackageRoot(node.id, packageRoots);
    if (!packageRoot) {
      continue;
    }

    const packageNodeId = getWorkspacePackageNodeId(packageRoot);
    edges.push({
      id: `${packageNodeId}->${node.id}#${STRUCTURAL_NESTS_EDGE_KIND}`,
      from: packageNodeId,
      to: node.id,
      kind: STRUCTURAL_NESTS_EDGE_KIND,
      sources: [],
    });
  }

  return edges;
}
