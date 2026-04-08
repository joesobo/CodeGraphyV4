export function isPackageNodeId(nodeId: string): boolean {
  return nodeId.startsWith('pkg:');
}

export function areOnlyPackageNodes(targets: readonly string[]): boolean {
  return targets.every((target) => isPackageNodeId(target));
}

export function buildOpenBlockLabel(targets: readonly string[]): string {
  return targets.length > 1 ? `Open ${targets.length} Files` : 'Open File';
}

export function shouldShowRevealInExplorer(
  targets: readonly string[],
  timelineActive: boolean,
): boolean {
  return targets.length === 1 && !timelineActive;
}

export function buildCopyRelativeLabel(targets: readonly string[]): string {
  return targets.length > 1 ? 'Copy Relative Paths' : 'Copy Relative Path';
}

export function shouldShowAbsoluteCopy(targets: readonly string[]): boolean {
  return targets.length === 1;
}
