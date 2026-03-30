/**
 * Check if a component is already covered by assigned files.
 */
export function isComponentCovered(component: Set<string>, assignedFiles: Set<string>): boolean {
  for (const member of component) {
    if (assignedFiles.has(member)) {
      return true;
    }
  }
  return false;
}

/**
 * Add all members of a component to the assigned set.
 */
export function addComponentToAssigned(component: Set<string>, assignedFiles: Set<string>): void {
  for (const member of component) {
    assignedFiles.add(member);
  }
}

/**
 * Find an import component that overlaps with the given members.
 */
export function findOverlappingComponent(members: Set<string>, components: Set<string>[]): Set<string> | undefined {
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
export function hasSignificantOverlap(set1: Set<string>, set2: Set<string>): boolean {
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
