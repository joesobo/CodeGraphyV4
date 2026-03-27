import { type QualityTarget } from './resolveTarget';
import { existingTestRoots, isTestPath } from './testRoots';

export function resolveTestScopes(target: QualityTarget): string[] {
  if (target.kind === 'repo') {
    return ['packages'];
  }

  if (!target.packageName || !target.packageRoot) {
    return [];
  }

  if (target.kind === 'package') {
    return existingTestRoots(target.packageRoot, target.packageName);
  }

  if (isTestPath(target.packageRelativePath)) {
    return [target.relativePath];
  }

  return [];
}
