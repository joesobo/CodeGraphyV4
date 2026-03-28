import { readFileSync } from 'fs';
import { pathIncludedByTool } from '../../config/quality';
import { type QualityTarget } from '../../shared/resolve/target';
import { REPO_ROOT } from '../../shared/resolve/repoRoot';
import { packageNamesForTarget } from './filePackages';
import { discoverPackageTestFiles } from './fileGlobs';
import { hasExplicitTestFileTarget, isInsideTarget } from './fileTargetScope';
import { type BaselineFileMetric } from './metric';

function isBaselineMetricWithPath(
  metric: BaselineFileMetric
): metric is BaselineFileMetric & { filePath: string } {
  return typeof metric.filePath === 'string';
}

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

export function readBaselineMetrics(baselinePath: string): BaselineFileMetric[] {
  return JSON.parse(readFileSync(baselinePath, 'utf-8')) as BaselineFileMetric[];
}

export function baselineMetricsByPath(
  baseline: BaselineFileMetric[]
): Map<string, BaselineFileMetric> {
  return new Map(
    baseline
      .filter(isBaselineMetricWithPath)
      .map((metric) => [metric.filePath, metric])
  );
}
