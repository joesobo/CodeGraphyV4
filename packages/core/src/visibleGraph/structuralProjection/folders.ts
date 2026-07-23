import type { IGraphNode } from '../../graph/contracts';
import { collectStructuralFolderPaths, createFolderNodes } from '../../graphControls/nests/folders';
import { FOLDER_NODE_TYPE } from '../model';

export interface FolderProjection {
  paths: Set<string>;
  nodes: IGraphNode[];
}

export function isFolderNode(node: IGraphNode): boolean {
  return node.nodeType === FOLDER_NODE_TYPE;
}

export function collectVisibleFolderNodeIds(nodes: readonly IGraphNode[]): Set<string> {
  return new Set(nodes.filter(isFolderNode).map((node) => node.id));
}

export function projectFolders(
  enabled: boolean,
  sourceFileNodes: IGraphNode[],
  sourceFolderNodes: IGraphNode[],
  visibleFolderNodeIds: ReadonlySet<string>,
): FolderProjection {
  if (!enabled) {
    return { paths: new Set<string>(), nodes: [] };
  }

  const folderPaths = collectStructuralFolderPaths(sourceFileNodes, sourceFolderNodes).paths;
  const generatedFolderPaths = collectGeneratedFolderPaths(folderPaths, visibleFolderNodeIds);

  return {
    paths: folderPaths,
    nodes: createFolderNodes(generatedFolderPaths),
  };
}

function collectGeneratedFolderPaths(
  folderPaths: ReadonlySet<string>,
  visibleFolderNodeIds: ReadonlySet<string>,
): Set<string> {
  return new Set(
    Array.from(folderPaths).filter((folderPath) => !visibleFolderNodeIds.has(folderPath)),
  );
}
