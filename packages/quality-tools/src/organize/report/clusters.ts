import { type OrganizeCohesionCluster } from '../types';

export function clusterLines(clusters: OrganizeCohesionCluster[], directoryPath: string): string[] {
  if (clusters.length === 0) {
    return [];
  }

  const lines: string[] = [];
  const indent = '  Clusters:  ';
  const indentAlignment = ' '.repeat(indent.length);

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    const confidence = cluster.confidence;
    const memberCount = cluster.memberCount;
    const base = directoryPath.endsWith('/') ? directoryPath : `${directoryPath}/`;
    const suggestedPath = `${base}${cluster.prefix}/`;
    const clusterLine = `${cluster.prefix} (${memberCount} files, ${confidence}) → suggest ${suggestedPath}`;

    if (i === 0) {
      lines.push(`${indent}${clusterLine}`);
    } else {
      lines.push(`${indentAlignment}${clusterLine}`);
    }
  }

  return lines;
}
