import type { IGraphData, IGraphEdge, IGraphNode } from '../graph/contracts';
import { collectFolderPaths, createFolderNodes } from '../graphControls/nests/folders';
import { createWorkspacePackageNodes } from '../graphControls/packages/nodes';
import {
  collectWorkspacePackageRoots,
  getNearestWorkspacePackageRoot,
} from '../graphControls/packages/roots';
import { getWorkspacePackageNodeId } from '../graphControls/packages/workspace';
import type { VisibleGraphScopeConfig } from './contracts';
import {
  filterEdgesToNodes,
  FOLDER_NODE_TYPE,
  getEnabledTypes,
  isFileNode,
  PACKAGE_NODE_TYPE,
  STRUCTURAL_NESTS_EDGE_KIND,
} from './model';

function createStructuralEdge(from: string, to: string): IGraphEdge {
  return {
    id: `${from}->${to}#${STRUCTURAL_NESTS_EDGE_KIND}`,
    from,
    to,
    kind: STRUCTURAL_NESTS_EDGE_KIND,
    sources: [],
  };
}

function buildContainmentEdges(
  folderPaths: ReadonlySet<string>,
  nodes: readonly IGraphNode[],
): IGraphData['edges'] {
  const edges: IGraphData['edges'] = [];

  for (const folderPath of folderPaths) {
    if (folderPath === '(root)') {
      continue;
    }

    const segments = folderPath.split('/');
    const parent = segments.length <= 1
      ? '(root)'
      : segments.slice(0, -1).join('/');
    edges.push(createStructuralEdge(parent, folderPath));
  }

  for (const node of nodes) {
    const segments = node.id.split('/');
    const parent = segments.length === 1 ? '(root)' : segments.slice(0, -1).join('/');
    edges.push(createStructuralEdge(parent, node.id));
  }

  return edges;
}

function buildWorkspacePackageEdges(
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

export function applyStructuralProjection(
  graphData: IGraphData,
  scope?: VisibleGraphScopeConfig,
  sourceGraphData: IGraphData = graphData,
): IGraphData {
  const enabledNodeTypes = getEnabledTypes(scope?.nodes ?? []);
  const folderEnabled = enabledNodeTypes.has(FOLDER_NODE_TYPE);
  const packageEnabled = enabledNodeTypes.has(PACKAGE_NODE_TYPE);

  if (!folderEnabled && !packageEnabled) {
    return graphData;
  }

  const enabledEdgeTypes = getEnabledTypes(scope?.edges ?? []);
  const disabledEdgeTypes = new Set((scope?.edges ?? []).filter((edge) => !edge.enabled).map((edge) => edge.type));
  const hasNestsScope = enabledEdgeTypes.has(STRUCTURAL_NESTS_EDGE_KIND) || disabledEdgeTypes.has(STRUCTURAL_NESTS_EDGE_KIND);
  const nestsEnabled = hasNestsScope ? enabledEdgeTypes.has(STRUCTURAL_NESTS_EDGE_KIND) : true;
  const sourceFileNodes = sourceGraphData.nodes.filter(isFileNode);
  const visibleFileNodes = graphData.nodes.filter(isFileNode);
  const folderPaths = folderEnabled ? collectFolderPaths(sourceFileNodes).paths : new Set<string>();
  const folderNodes = folderEnabled
    ? createFolderNodes(folderPaths, '')
    : [];
  const workspacePackageRoots = packageEnabled
    ? collectWorkspacePackageRoots(sourceFileNodes)
    : new Set<string>();
  const packageNodes = packageEnabled
    ? createWorkspacePackageNodes(workspacePackageRoots, '')
    : [];
  const nodes = [...graphData.nodes, ...folderNodes, ...packageNodes];
  const structuralEdges = nestsEnabled
    ? [
        ...(folderEnabled ? buildContainmentEdges(folderPaths, visibleFileNodes) : []),
        ...(packageEnabled ? buildWorkspacePackageEdges(workspacePackageRoots, visibleFileNodes) : []),
      ]
    : [];

  return {
    nodes,
    edges: filterEdgesToNodes([...graphData.edges, ...structuralEdges], nodes),
  };
}
