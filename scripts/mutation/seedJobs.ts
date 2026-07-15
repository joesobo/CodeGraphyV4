import {
  extensionNodeTestIncludes,
  extensionWebviewTestIncludes,
} from '../../packages/extension/vitest.includes';
import { resolveCodeGraphyQualityTarget } from './codegraphyMutate';

export interface MutationSeedJob {
  mutate: string[];
  package: string;
  shard: string;
  testIncludes: string[];
}

export interface MutationSeedJobMatrixEntry {
  package: string;
  shard: string;
}

export const extensionMutationSeedJobs: MutationSeedJob[] = [
  {
    mutate: [
      'packages/extension/src/extension/graphView/provider/**/*.ts',
      'packages/extension/src/extension/graphView/webview/**/*.ts',
      'packages/extension/src/extension/graphViewProvider.ts',
    ],
    package: 'extension',
    shard: 'host-graphview-provider',
    testIncludes: extensionNodeTestIncludes,
  },
  {
    mutate: [
      'packages/extension/src/extension/graphView/**/*.ts',
      '!packages/extension/src/extension/graphView/provider/**/*.ts',
      '!packages/extension/src/extension/graphView/webview/**/*.ts',
    ],
    package: 'extension',
    shard: 'host-graphview-model',
    testIncludes: extensionNodeTestIncludes,
  },
  {
    mutate: [
      'packages/extension/src/extension/pipeline/**/*.ts',
      'packages/extension/src/extension/workspaceFiles/**/*.ts',
      'packages/extension/src/extension/repoSettings/**/*.ts',
    ],
    package: 'extension',
    shard: 'host-indexing',
    testIncludes: extensionNodeTestIncludes,
  },
  {
    mutate: [
      'packages/extension/src/extension/**/*.ts',
      '!packages/extension/src/extension/graphViewProvider.ts',
      '!packages/extension/src/extension/graphView/**/*.ts',
      '!packages/extension/src/extension/pipeline/**/*.ts',
      '!packages/extension/src/extension/workspaceFiles/**/*.ts',
      '!packages/extension/src/extension/repoSettings/**/*.ts',
      'packages/extension/src/core/**/*.ts',
      'packages/extension/src/shared/**/*.ts',
    ],
    package: 'extension',
    shard: 'host-platform-core-shared',
    testIncludes: extensionNodeTestIncludes,
  },
  {
    mutate: [
      'packages/extension/src/webview/**/*.ts',
      'packages/extension/src/webview/**/*.tsx',
    ],
    package: 'extension',
    shard: 'webview',
    testIncludes: extensionWebviewTestIncludes,
  },
];

function packageMutationSeedJob(packageName: string): MutationSeedJob {
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

export function discoverMutationPackageNames(repoRoot: string): string[] {
  return [
    'core',
    'extension',
    'graph-renderer',
    'mcp',
    'plugin-godot',
    'plugin-unity',
    'plugin-markdown',
    'plugin-typescript',
  ].filter((packageName) => (
    resolveCodeGraphyQualityTarget(repoRoot, packageName).kind === 'package'
  ));
}

export function discoverMutationSeedJobs(repoRoot: string): MutationSeedJob[] {
  return discoverMutationPackageNames(repoRoot).flatMap((packageName): MutationSeedJob[] => (
    packageName === 'extension'
      ? extensionMutationSeedJobs
      : [packageMutationSeedJob(packageName)]
  ));
}

export function discoverMutationSeedJobMatrix(repoRoot: string): MutationSeedJobMatrixEntry[] {
  return discoverMutationSeedJobs(repoRoot).map((job) => ({
    package: job.package,
    shard: job.shard,
  }));
}

export function findMutationSeedJob(
  repoRoot: string,
  packageName: string,
  shard: string,
): MutationSeedJob {
  const job = discoverMutationSeedJobs(repoRoot)
    .find((candidate) => candidate.package === packageName && candidate.shard === shard);

  if (!job) {
    throw new Error(`Unknown mutation seed job: ${packageName}/${shard}`);
  }

  return job;
}
