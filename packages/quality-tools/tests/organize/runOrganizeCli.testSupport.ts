import { vi } from 'vitest';
import { REPO_ROOT } from '../../src/shared/repoRoot';
import type { QualityTarget } from '../../src/shared/resolveTarget';
import type { OrganizeDirectoryMetric } from '../../src/organize/organizeTypes';
import type { OrganizeCliDependencies } from '../../src/organize/runOrganizeCli';

export function qualityToolsTarget(): QualityTarget {
  return {
    absolutePath: `${REPO_ROOT}/packages/quality-tools`,
    kind: 'package',
    packageName: 'quality-tools',
    packageRelativePath: '.',
    packageRoot: `${REPO_ROOT}/packages/quality-tools`,
    relativePath: 'packages/quality-tools'
  };
}

export function createMetrics(): OrganizeDirectoryMetric[] {
  return [
    {
      averageRedundancy: 0.2,
      clusters: [],
      depth: 3,
      depthVerdict: 'STABLE',
      directoryPath: `${REPO_ROOT}/packages/quality-tools/src`,
      fileIssues: [],
      fileFanOut: 5,
      fileFanOutVerdict: 'STABLE',
      folderFanOut: 2,
      folderFanOutVerdict: 'STABLE'
    }
  ];
}

export function createDependencies(
  overrides: Partial<OrganizeCliDependencies> = {}
): OrganizeCliDependencies {
  return {
    analyzeOrganize: vi.fn(() => createMetrics()),
    reportOrganize: vi.fn(),
    resolveQualityTarget: vi.fn(() => qualityToolsTarget()),
    setExitCode: vi.fn(),
    ...overrides
  };
}
