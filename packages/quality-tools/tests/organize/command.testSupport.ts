import { vi } from 'vitest';
import { REPO_ROOT } from '../../src/shared/resolve/repoRoot';
import type { QualityTarget } from '../../src/shared/resolve/target';
import type { OrganizeDirectoryMetric } from '../../src/organize/types';
import type { OrganizeCliDependencies } from '../../src/organize/command';

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
    analyze: vi.fn(() => createMetrics()),
    compareBaseline: vi.fn(() => new Map()),
    mkdirSync: vi.fn(),
    reportOrganize: vi.fn(),
    resolveQualityTarget: vi.fn(() => qualityToolsTarget()),
    setExitCode: vi.fn(),
    writeFileSync: vi.fn(),
    ...overrides
  };
}
