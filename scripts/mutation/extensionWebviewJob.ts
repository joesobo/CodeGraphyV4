import { extensionWebviewTestIncludes } from '../../packages/extension/vitest.includes';
import type { MutationSeedJob } from './contracts';

export const extensionWebviewMutationSeedJob: MutationSeedJob = {
  mutate: [
    'packages/extension/src/webview/**/*.ts',
    'packages/extension/src/webview/**/*.tsx',
  ],
  package: 'extension',
  shard: 'webview',
  testIncludes: extensionWebviewTestIncludes,
};
