import { relative } from 'path';
import { REPO_ROOT } from '../shared/resolve/repoRoot';
import { loadOrganizeConfig } from './config';
import { walkDirectories } from './metric/directoryWalk';
import { fileFanOutVerdict } from './metric/fileFanOut';
import { folderFanOutVerdict } from './metric/folderFanOut';
import { directoryDepth, depthVerdict } from './metric/directoryDepth';
import { buildImportGraph } from './cohesion/importGraph';
import { findCohesionClusters } from './cohesion/clusters';
import { extractAncestorFolders, computeAverageRedundancy } from './ancestors';
import { collectFileIssues } from './issues';
import type { QualityTarget } from '../shared/resolve/target';
import type { OrganizeDirectoryMetric } from './types';

export function analyze(target: QualityTarget): OrganizeDirectoryMetric[] {
  const config = loadOrganizeConfig(REPO_ROOT, target.packageName);
  const entries = walkDirectories(target.absolutePath);

  const metrics: OrganizeDirectoryMetric[] = [];

  for (const entry of entries) {
    // Calculate relative path from target
    const directoryPath = entry.directoryPath === target.absolutePath ? '.' : relative(target.absolutePath, entry.directoryPath);

    // File fan-out
    const fileFanOut = entry.files.length;
    const fileFanOutVerd = fileFanOutVerdict(fileFanOut, config.fileFanOut.warning, config.fileFanOut.split);

    // Folder fan-out
    const folderFanOut = entry.subdirectories.length;
    const folderFanOutVerd = folderFanOutVerdict(folderFanOut, config.folderFanOut.warning, config.folderFanOut.split);

    // Directory depth
    const depth = directoryDepth(entry.directoryPath, target.absolutePath);
    const depthVerd = depthVerdict(depth, config.depth.warning, config.depth.deep);

    // Path redundancy
    const ancestorFolders = extractAncestorFolders(directoryPath);
    const averageRedundancy = computeAverageRedundancy(entry.files, ancestorFolders);

    // File issues: path redundancy, low-info names, and barrel files
    const fileIssues = collectFileIssues(entry.files, entry.directoryPath, ancestorFolders, config.lowInfoNames, config.redundancyThreshold);

    // Build import graph and find clusters
    const importGraph = buildImportGraph(entry.directoryPath, entry.files);
    const clusters = findCohesionClusters(entry.files, importGraph, config.cohesionClusterMinSize);

    metrics.push({
      averageRedundancy: Math.round(averageRedundancy * 100) / 100,
      clusters,
      depth,
      depthVerdict: depthVerd,
      directoryPath,
      fileIssues,
      fileFanOut,
      fileFanOutVerdict: fileFanOutVerd,
      folderFanOut,
      folderFanOutVerdict: folderFanOutVerd
    });
  }

  return metrics;
}
