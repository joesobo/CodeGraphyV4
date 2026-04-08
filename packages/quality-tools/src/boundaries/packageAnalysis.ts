import { basename } from 'path';
import { parseFileImports } from '../organize/cohesion/parse';
import type { WorkspacePackage } from '../shared/util/workspacePackages';
import { deadEnds, deadSurfaces } from './deadFiles';
import { resolveImportTarget } from './imports';
import { createNodesByPath, type BoundaryNodeIndex } from './nodeIndex';
import type { BoundaryReport, BoundaryViolation } from './types';

function collectViolations(
  absolutePath: string,
  nodesByPath: BoundaryNodeIndex,
  candidatePaths: Set<string>,
  violations: BoundaryViolation[]
): void {
  const node = nodesByPath.get(absolutePath)!;

  const imports = parseFileImports(absolutePath, basename(absolutePath));
  for (const specifier of imports) {
    const resolvedImport = resolveImportTarget(absolutePath, specifier, candidatePaths);
    if (!resolvedImport) {
      continue;
    }

    const importedNode = nodesByPath.get(resolvedImport)!;

    node.outgoing += 1;
    importedNode.incoming += 1;

    if (
      node.layer &&
      importedNode.layer &&
      node.layer !== importedNode.layer &&
      !node.allowedLayers.includes(importedNode.layer)
    ) {
      violations.push({
        from: node.relativePath,
        fromLayer: node.layer,
        reason: `${node.layer} cannot depend on ${importedNode.layer}`,
        to: importedNode.relativePath,
        toLayer: importedNode.layer
      });
    }
  }
}

export function analyzePackage(repoRoot: string, workspacePackage: WorkspacePackage): BoundaryReport {
  const { candidatePaths, nodesByPath } = createNodesByPath(repoRoot, workspacePackage);
  const violations: BoundaryViolation[] = [];

  for (const absolutePath of candidatePaths) {
    collectViolations(absolutePath, nodesByPath, candidatePaths, violations);
  }

  const files = [...nodesByPath.values()];

  return {
    deadEnds: deadEnds(files),
    deadSurfaces: deadSurfaces(files),
    files,
    layerViolations: violations,
    target: `packages/${workspacePackage.name}`
  };
}
