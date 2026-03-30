import type { ImportAdjacency } from './importGraph';
import type { OrganizeCohesionCluster } from '../types';
import { buildPrefixGroups, derivePrefix } from './prefix';
import { findImportComponents } from './components';
import { isComponentCovered, addComponentToAssigned, findOverlappingComponent, hasSignificantOverlap } from './overlap';

/**
 * Create a cluster from a prefix group.
 */
function createPrefixCluster(
  prefix: string,
  members: Set<string>,
  validImportComponents: Set<string>[]
): OrganizeCohesionCluster {
  const memberArray = Array.from(members).sort();
  const overlapComponent = findOverlappingComponent(members, validImportComponents);

  const confidence =
    overlapComponent && hasSignificantOverlap(members, overlapComponent)
      ? ('prefix+imports' as const)
      : ('prefix-only' as const);

  return {
    prefix,
    members: memberArray,
    memberCount: memberArray.length,
    suggestedFolder: prefix.toLowerCase(),
    confidence
  };
}

/**
 * Create a cluster from an import component.
 */
function createImportCluster(component: Set<string>): OrganizeCohesionCluster {
  const memberArray = Array.from(component).sort();
  const prefix = derivePrefix(memberArray);

  return {
    prefix,
    members: memberArray,
    memberCount: memberArray.length,
    suggestedFolder: prefix.toLowerCase(),
    confidence: 'imports-only'
  };
}

/**
 * Find cohesion clusters by merging prefix grouping and import graph signals.
 *
 * Algorithm:
 * 1. Group files by their first token (prefix)
 * 2. Find connected components in the import graph (undirected)
 * 3. Merge signals: check if prefix groups overlap with import components
 * 4. Assign confidence levels based on signal source
 *
 * @param fileNames - List of filenames to cluster
 * @param importGraph - Import adjacency map from buildImportGraph
 * @param minClusterSize - Minimum cluster size to include
 * @returns Sorted list of cohesion clusters (by memberCount desc, then prefix asc)
 */
export function findCohesionClusters(
  fileNames: string[],
  importGraph: ImportAdjacency,
  minClusterSize: number
): OrganizeCohesionCluster[] {
  const clusters: OrganizeCohesionCluster[] = [];

  // Step 1: Build prefix groups
  const prefixGroups = buildPrefixGroups(fileNames);
  const validPrefixGroups = new Map<string, Set<string>>();
  for (const [prefix, members] of prefixGroups) {
    if (members.size >= minClusterSize) {
      validPrefixGroups.set(prefix, members);
    }
  }

  // Step 2: Find import-based connected components
  const importComponents = findImportComponents(fileNames, importGraph);
  const validImportComponents = importComponents.filter((component) => component.size >= minClusterSize);

  // Step 3: Merge signals
  const assignedFiles = new Set<string>();

  // Process prefix groups
  for (const [prefix, members] of validPrefixGroups) {
    const cluster = createPrefixCluster(prefix, members, validImportComponents);
    clusters.push(cluster);
    addComponentToAssigned(members, assignedFiles);
  }

  // Process remaining import components not covered by prefix groups
  for (const component of validImportComponents) {
    if (!isComponentCovered(component, assignedFiles)) {
      const cluster = createImportCluster(component);
      clusters.push(cluster);
      addComponentToAssigned(component, assignedFiles);
    }
  }

  // Sort by memberCount descending, then prefix alphabetically
  clusters.sort((clusterA, clusterB) => {
    if (clusterA.memberCount !== clusterB.memberCount) {
      return clusterB.memberCount - clusterA.memberCount;
    }
    return clusterA.prefix.localeCompare(clusterB.prefix);
  });

  return clusters;
}
