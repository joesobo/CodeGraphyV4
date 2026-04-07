import { existsSync } from 'fs';
import { join } from 'path';
import type { QualityTarget } from '../shared/resolve/target';
import { listWorkspacePackages, type WorkspacePackage } from '../shared/util/workspacePackages';
import { analyzePackage } from './packageAnalysis';
import { mergeReports } from './merge';
import type { BoundaryReport } from './types';

function analyzePackageRoot(repoRoot: string, workspacePackage: WorkspacePackage): BoundaryReport {
  return analyzePackage(repoRoot, workspacePackage);
}

export function analyzeBoundaries(repoRoot: string, target: QualityTarget): BoundaryReport {
  if (target.kind === 'repo') {
    return mergeReports(
      'packages',
      listWorkspacePackages(repoRoot).map((workspacePackage) => analyzePackageRoot(repoRoot, workspacePackage))
    );
  }

  if (target.packageName) {
    return analyzePackageRoot(repoRoot, {
      name: target.packageName,
      root: target.packageRoot ?? join(repoRoot, 'packages', target.packageName)
    });
  }

  if (existsSync(target.absolutePath)) {
    const workspacePackage = {
      name: target.absolutePath.split('/').pop() ?? 'target',
      root: target.absolutePath
    };
    return analyzePackageRoot(repoRoot, workspacePackage);
  }

  return {
    deadEnds: [],
    deadSurfaces: [],
    files: [],
    layerViolations: [],
    target: target.relativePath
  };
}
