import {
  collectFolderPaths,
  createFolderNodes,
} from '../../../shared/graphControls/nests/folders';
import { buildContainmentEdges } from '../../../shared/graphControls/nests/edges';
import {
  collectWorkspacePackageRoots,
} from '../../../shared/graphControls/packages/roots';
import { createWorkspacePackageNodes } from '../../../shared/graphControls/packages/nodes';
import { buildWorkspacePackageEdges } from '../../../shared/graphControls/packages/edges';
import type { IGraphData, IGraphNode } from '../../../shared/graph/contracts';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../../shared/graphControls/defaults/definitions';
import {
  DEFAULT_FOLDER_NODE_COLOR,
  DEFAULT_PACKAGE_NODE_COLOR,
} from '../../../shared/fileColors';

function buildFolderStructuralNodes(
  fileNodes: IGraphNode[],
  nodeVisibility: Record<string, boolean>,
  nodeColors: Record<string, string>,
): { folderNodes: IGraphNode[]; folderPaths: Set<string> } {
  const folderEnabled = nodeVisibility.folder ?? false;
  const folderPaths = folderEnabled ? collectFolderPaths(fileNodes).paths : new Set<string>();

  return {
    folderPaths,
    folderNodes: folderEnabled
      ? createFolderNodes(folderPaths, nodeColors.folder ?? DEFAULT_FOLDER_NODE_COLOR)
      : [],
  };
}

function buildPackageStructuralNodes(
  fileNodes: IGraphNode[],
  nodeVisibility: Record<string, boolean>,
  nodeColors: Record<string, string>,
): { packageNodes: IGraphNode[]; workspacePackageRoots: Set<string> } {
  const packageEnabled = nodeVisibility.package ?? false;
  const workspacePackageRoots = packageEnabled
    ? collectWorkspacePackageRoots(fileNodes)
    : new Set<string>();

  return {
    packageNodes: packageEnabled
      ? createWorkspacePackageNodes(
          workspacePackageRoots,
          nodeColors.package ?? DEFAULT_PACKAGE_NODE_COLOR,
        )
      : [],
    workspacePackageRoots,
  };
}

export function buildStructuralGraphNodes(
  fileNodes: IGraphNode[],
  nodeVisibility: Record<string, boolean>,
  nodeColors: Record<string, string>,
): {
  folderPaths: Set<string>;
  folderNodes: IGraphNode[];
  packageNodes: IGraphNode[];
  workspacePackageRoots: Set<string>;
} {
  const { folderNodes, folderPaths } = buildFolderStructuralNodes(fileNodes, nodeVisibility, nodeColors);
  const { packageNodes, workspacePackageRoots } = buildPackageStructuralNodes(fileNodes, nodeVisibility, nodeColors);

  return {
    folderPaths,
    folderNodes,
    packageNodes,
    workspacePackageRoots,
  };
}

export function buildStructuralEdges(
  visibleFileNodes: IGraphNode[],
  nodeVisibility: Record<string, boolean>,
  edgeVisibility: Record<string, boolean>,
  folderPaths: Set<string>,
  workspacePackageRoots: Set<string>,
): IGraphData['edges'] {
  const folderEnabled = nodeVisibility.folder ?? false;
  const packageEnabled = nodeVisibility.package ?? false;
  const nestsEnabled = edgeVisibility[STRUCTURAL_NESTS_EDGE_KIND] ?? true;

  if (!nestsEnabled) {
    return [];
  }

  return [
    ...(folderEnabled ? buildContainmentEdges(folderPaths, visibleFileNodes) : []),
    ...(packageEnabled ? buildWorkspacePackageEdges(workspacePackageRoots, visibleFileNodes) : []),
  ];
}
