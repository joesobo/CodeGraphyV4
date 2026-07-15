import { resolveCodeGraphyQualityTarget } from './codegraphyMutate';
import type { MutationSeedJob } from './contracts';

const MUTATION_PACKAGE_NAMES = [
  'core',
  'extension',
  'graph-renderer',
  'mcp',
  'plugin-godot',
  'plugin-unity',
  'plugin-markdown',
  'plugin-typescript',
];

export function discoverMutationPackageNames(repoRoot: string): string[] {
  return MUTATION_PACKAGE_NAMES.filter(packageName => (
    resolveCodeGraphyQualityTarget(repoRoot, packageName).kind === 'package'
  ));
}

export function createPackageMutationSeedJob(packageName: string): MutationSeedJob {
  return {
    mutate: [
      `packages/${packageName}/src/**/*.ts`,
      `packages/${packageName}/src/**/*.tsx`,
    ],
    package: packageName,
    shard: packageName,
    testIncludes: [
      `packages/${packageName}/tests/**/*.test.ts`,
      `packages/${packageName}/tests/**/*.test.tsx`,
    ],
  };
}
