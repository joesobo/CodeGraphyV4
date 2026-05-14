import type { IGraphData, IGraphEdge, IGraphNode } from '../../graph/contracts';
import {
  getNearestWorkspacePackageRoot,
} from '../../graphControls/packages/roots';
import { getWorkspacePackageNodeId } from '../../graphControls/packages/workspace';
import { isFileNode, STRUCTURAL_NESTS_EDGE_KIND } from '../model';
import type { StructuralProjectionOptions } from './options';

export function createStructuralEdge(from: string, to: string): IGraphEdge {
  return {
    id: `${from}->${to}#${STRUCTURAL_NESTS_EDGE_KIND}`,
    from,
    to,
    kind: STRUCTURAL_NESTS_EDGE_KIND,
    sources: [],
  };
}

export function buildContainmentEdges(
  folderPaths: ReadonlySet<string>,
  nodes: readonly IGraphNode[],
): IGraphData['edges'] {
  const edges: IGraphData['edges'] = [];

  for (const folderPath of folderPaths) {
    if (folderPath === '(root)') {
      continue;
    }

    edges.push(createStructuralEdge(getParentPath(folderPath), folderPath));
  }

  for (const node of nodes) {
    edges.push(createStructuralEdge(getParentPath(node.id), node.id));
  }

  return edges;
}

export function buildWorkspacePackageEdges(
  packageRoots: ReadonlySet<string>,
  nodes: readonly IGraphNode[],
): IGraphData['edges'] {
  const edges: IGraphData['edges'] = [];

  for (const node of nodes) {
    if (!isFileNode(node)) {
      continue;
    }

    const packageRoot = getNearestWorkspacePackageRoot(node.id, packageRoots);
    if (packageRoot) {
      edges.push(createStructuralEdge(getWorkspacePackageNodeId(packageRoot), node.id));
    }
  }

  return edges;
}

export function buildProjectedStructuralEdges(
  options: StructuralProjectionOptions,
  folderPaths: ReadonlySet<string>,
  packageRoots: ReadonlySet<string>,
  visibleFileNodes: readonly IGraphNode[],
): IGraphData['edges'] {
  if (!options.nestsEnabled) {
    return [];
  }

  return [
    ...(options.folderEnabled ? buildContainmentEdges(folderPaths, visibleFileNodes) : []),
    ...(options.packageEnabled ? buildWorkspacePackageEdges(packageRoots, visibleFileNodes) : []),
  ];
}

function getParentPath(path: string): string {
  const segments = path.split('/');
  return segments.length === 1 ? '(root)' : segments.slice(0, -1).join('/');
}
