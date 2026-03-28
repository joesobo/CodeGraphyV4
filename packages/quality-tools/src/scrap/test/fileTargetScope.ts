import { relativeTo } from '../../shared/util/pathUtils';
import { type QualityTarget } from '../../shared/resolve/target';

export interface ExplicitTestFileTarget extends QualityTarget {
  kind: 'file';
  packageName: string;
  packageRelativePath: string;
}

export function hasExplicitTestFileTarget(target: QualityTarget): target is ExplicitTestFileTarget {
  return target.kind === 'file' && !!target.packageName && !!target.packageRelativePath;
}

export function isInsideTarget(target: QualityTarget, repoRoot: string, absolutePath: string): boolean {
  const relativePath = relativeTo(repoRoot, absolutePath);
  if (target.kind === 'repo') {
    return true;
  }

  if (target.kind === 'package') {
    return relativePath.startsWith(`${target.relativePath}/`);
  }

  return relativePath === target.relativePath || relativePath.startsWith(`${target.relativePath}/`);
}
