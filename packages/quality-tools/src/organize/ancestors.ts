import { pathRedundancy } from './metric/pathRedundancy';

/**
 * Extract ancestor folders from a relative directory path.
 */
export function extractAncestorFolders(directoryPath: string): string[] {
  if (directoryPath === '.') {
    return [];
  }
  return directoryPath.split(/[/\\]/).filter((seg) => seg.length > 0);
}

/**
 * Compute average path redundancy score for files in a directory.
 */
export function computeAverageRedundancy(fileNames: string[], ancestorFolders: string[]): number {
  const redundancyScores = fileNames.map((fileName) => pathRedundancy(fileName, ancestorFolders));
  if (redundancyScores.length === 0) {
    return 0;
  }
  const sum = redundancyScores.reduce((total, score) => total + score, 0);
  return sum / redundancyScores.length;
}
