import { tokenize } from '../tokenize';
import type { ImportAdjacency } from './importGraph';
import type { OrganizeCohesionCluster } from '../organizeTypes';

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
  // Track which files have been assigned to a cluster
  const assignedFiles = new Set<string>();

  // Process prefix groups
  for (const [prefix, members] of validPrefixGroups) {
    const memberArray = Array.from(members).sort();
    const overlapComponent = findOverlappingComponent(members, validImportComponents);

    const confidence =
      overlapComponent && hasSignificantOverlap(members, overlapComponent)
        ? ('prefix+imports' as const)
        : ('prefix-only' as const);

    clusters.push({
      prefix,
      members: memberArray,
      memberCount: memberArray.length,
      suggestedFolder: prefix.toLowerCase(),
      confidence
    });

    for (const member of members) {
      assignedFiles.add(member);
    }
  }

  // Process remaining import components not covered by prefix groups
  for (const component of validImportComponents) {
    // Check if this component was already covered
    let alreadyCovered = false;
    for (const member of component) {
      if (assignedFiles.has(member)) {
        alreadyCovered = true;
        break;
      }
    }

    if (!alreadyCovered) {
      const memberArray = Array.from(component).sort();
      const prefix = derivePrefix(memberArray);

      clusters.push({
        prefix,
        members: memberArray,
        memberCount: memberArray.length,
        suggestedFolder: prefix.toLowerCase(),
        confidence: 'imports-only'
      });

      for (const member of component) {
        assignedFiles.add(member);
      }
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

/**
 * Group files by their first token (prefix).
 */
function buildPrefixGroups(fileNames: string[]): Map<string, Set<string>> {
  const groups = new Map<string, Set<string>>();

  for (const fileName of fileNames) {
    const tokens = tokenize(fileName);
    if (tokens.length > 0) {
      const prefix = tokens[0];
      if (!groups.has(prefix)) {
        groups.set(prefix, new Set());
      }
      groups.get(prefix)!.add(fileName);
    }
  }

  return groups;
}

/**
 * Find connected components in the import graph (treating it as undirected).
 */
function findImportComponents(fileNames: string[], importGraph: ImportAdjacency): Set<string>[] {
  const visited = new Set<string>();
  const components: Set<string>[] = [];

  for (const fileName of fileNames) {
    if (!visited.has(fileName)) {
      const component = new Set<string>();
      bfsComponent(fileName, importGraph, visited, component);
      if (component.size > 0) {
        components.push(component);
      }
    }
  }

  return components;
}

/**
 * BFS to find all files connected to the starting file (treating imports as undirected).
 */
function bfsComponent(
  startFile: string,
  importGraph: ImportAdjacency,
  visited: Set<string>,
  component: Set<string>
) {
  const queue: string[] = [startFile];
  visited.add(startFile);
  component.add(startFile);

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Forward edges: files that current imports
    const importedFiles = importGraph.get(current) ?? new Set();
    for (const imported of importedFiles) {
      if (!visited.has(imported)) {
        visited.add(imported);
        component.add(imported);
        queue.push(imported);
      }
    }

    // Backward edges: files that import current (treat as undirected)
    for (const [file, imports] of importGraph) {
      if (imports.has(current) && !visited.has(file)) {
        visited.add(file);
        component.add(file);
        queue.push(file);
      }
    }
  }
}

/**
 * Find an import component that overlaps with the given members.
 */
function findOverlappingComponent(members: Set<string>, components: Set<string>[]): Set<string> | undefined {
  for (const component of components) {
    for (const member of members) {
      if (component.has(member)) {
        return component;
      }
    }
  }
  return undefined;
}

/**
 * Check if two sets have >= 50% overlap.
 * Calculated as: (intersection size) / (smaller set size) >= 50%
 */
function hasSignificantOverlap(set1: Set<string>, set2: Set<string>): boolean {
  const smaller = set1.size <= set2.size ? set1 : set2;
  const threshold = Math.ceil((smaller.size * 50) / 100);

  let overlapCount = 0;
  for (const item of smaller) {
    // Check if item is in both sets
    if (set1.has(item) && set2.has(item)) {
      overlapCount++;
    }
  }

  return overlapCount >= threshold;
}

/**
 * Derive a prefix from a list of filenames.
 * Tries to find the most common first token, or uses the first file's first token.
 */
function derivePrefix(fileNames: string[]): string {
  if (fileNames.length === 0) {
    return '';
  }

  // Count first tokens
  const tokenCounts = new Map<string, number>();
  for (const fileName of fileNames) {
    const tokens = tokenize(fileName);
    if (tokens.length > 0) {
      const token = tokens[0];
      tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
    }
  }

  // Find the most common token
  let mostCommonToken = '';
  let maxCount = 0;
  for (const [token, count] of tokenCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonToken = token;
    }
  }

  // If we found a common token, use it
  if (mostCommonToken) {
    return mostCommonToken;
  }

  // Fallback: use the first file's first token
  const tokens = tokenize(fileNames[0]);
  return tokens.length > 0 ? tokens[0] : fileNames[0];
}
