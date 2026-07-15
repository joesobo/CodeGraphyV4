import { extensionNodeTestIncludes } from '../../packages/extension/vitest.includes';
import type { MutationSeedJob } from './contracts';

export const extensionHostMutationSeedJobs: MutationSeedJob[] = [
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
];
