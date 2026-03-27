import { pathIncludedByTool } from '../config/qualityConfig';
import { type QualityTarget } from '../shared/resolveTarget';
import { REPO_ROOT } from '../shared/repoRoot';
import { packageNamesForTarget } from './testFilePackages';
import { discoverPackageTestFiles } from './testFileGlobs';
import { hasExplicitTestFileTarget, isInsideTarget } from './testFileTargetScope';

export function discoverTestFiles(target: QualityTarget): string[] {
  if (hasExplicitTestFileTarget(target)) {
    return pathIncludedByTool(REPO_ROOT, target.packageName, 'scrap', target.packageRelativePath)
      ? [target.absolutePath]
      : [];
  }

  return packageNamesForTarget(target, REPO_ROOT)
    .flatMap((packageName) => discoverPackageTestFiles(packageName, REPO_ROOT))
    .filter((filePath) => isInsideTarget(target, REPO_ROOT, filePath));
}
