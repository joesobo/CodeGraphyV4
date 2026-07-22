import type { IGraphNode } from '../../graph/contracts';
import { createWorkspacePackageNodes } from '../../graphControls/packages/nodes';
import { collectWorkspacePackageRoots } from '../../graphControls/packages/roots';

export interface PackageProjection {
  roots: Set<string>;
  nodes: IGraphNode[];
}

export function projectWorkspacePackages(
  enabled: boolean,
  sourceFileNodes: IGraphNode[],
): PackageProjection {
  if (!enabled) {
    return { roots: new Set<string>(), nodes: [] };
  }

  const roots = collectWorkspacePackageRoots(sourceFileNodes);

  return {
    roots,
    nodes: createWorkspacePackageNodes(roots),
  };
}
