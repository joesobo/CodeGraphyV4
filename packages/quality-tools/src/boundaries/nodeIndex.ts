import { resolvePackageBoundaryConfig } from '../config/quality';
import { toPosix } from '../shared/util/pathUtils';
import type { WorkspacePackage } from '../shared/util/workspacePackages';
import { createNode } from './node';
import { resolvePackageCandidates } from './selection';
import type { BoundaryFileNode } from './types';

export type BoundaryNode = BoundaryFileNode & { allowedLayers: string[] };
export type BoundaryNodeIndex = Map<string, BoundaryNode>;

export function createNodesByPath(
  repoRoot: string,
  workspacePackage: WorkspacePackage
): { candidatePaths: Set<string>; nodesByPath: BoundaryNodeIndex } {
  const config = resolvePackageBoundaryConfig(repoRoot, workspacePackage.name);
  const selectedPaths = resolvePackageCandidates(repoRoot, workspacePackage);
  const nodesByPath: BoundaryNodeIndex = new Map(
    selectedPaths.map((absolutePath) => {
      const packageRelativePath = toPosix(absolutePath.slice(workspacePackage.root.length + 1));
      const relativePath = toPosix(absolutePath.slice(repoRoot.length + 1));
      const node = createNode(
        absolutePath,
        workspacePackage.name,
        packageRelativePath,
        relativePath,
        config.layers,
        config.entrypoints
      ) as BoundaryNode;
      node.allowedLayers = config.layers.find((layer) => layer.name === node.layer)?.allow ?? [];
      return [absolutePath, node];
    })
  );

  return {
    candidatePaths: new Set(selectedPaths),
    nodesByPath
  };
}
