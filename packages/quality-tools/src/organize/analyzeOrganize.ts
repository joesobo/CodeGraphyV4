import { readFileSync } from 'fs';
import { relative } from 'path';
import { REPO_ROOT } from '../shared/repoRoot';
import { loadOrganizeConfig } from './organizeConfig';
import { walkDirectories } from './directoryWalk';
import { fileFanOutVerdict } from './fileFanOut';
import { folderFanOutVerdict } from './folderFanOut';
import { directoryDepth, depthVerdict } from './directoryDepth';
import { pathRedundancy } from './pathRedundancy';
import { checkLowInfoName } from './lowInfoNames';
import { checkBarrelFile } from './barrelDetection';
import { buildImportGraph } from './importGraph';
import { findCohesionClusters } from './cohesionClusters';
import type { QualityTarget } from '../shared/resolveTarget';
import type { OrganizeDirectoryMetric, OrganizeFileIssue } from './organizeTypes';

export function analyzeOrganize(target: QualityTarget): OrganizeDirectoryMetric[] {
  const config = loadOrganizeConfig(REPO_ROOT);
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
    const redundancyScores = entry.files.map((fileName) => {
      // Derive ancestor folders from the relative path
      const relPath = directoryPath === '.' ? '' : directoryPath;
      const ancestorFolders = relPath ? relPath.split(/[/\\]/).filter((seg) => seg.length > 0) : [];
      return pathRedundancy(fileName, ancestorFolders);
    });
    const averageRedundancy = redundancyScores.length > 0 ? redundancyScores.reduce((a, b) => a + b, 0) / redundancyScores.length : 0;

    // File issues: low-info names and barrel files
    const fileIssues: OrganizeFileIssue[] = [];
    for (const fileName of entry.files) {
      // Check low-info name
      const lowInfoIssue = checkLowInfoName(fileName, config.lowInfoNames, false);
      if (lowInfoIssue) {
        fileIssues.push(lowInfoIssue);
      }

      // Check barrel file
      try {
        const filePath = `${entry.directoryPath}/${fileName}`;
        const fileContent = readFileSync(filePath, 'utf-8');
        const barrelIssue = checkBarrelFile(fileName, fileContent);
        if (barrelIssue) {
          fileIssues.push(barrelIssue);
        }
      } catch {
        // Skip files that cannot be read
      }
    }

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
