import * as path from 'node:path';
import { sendCoreExtensionRequest, type CoreExtensionBridgeResponse } from './bridge';
import type { IndexRepoInput, IndexRepoResult, ToolErrorResult } from './model';

export interface IndexRepoDependencies {
  sendIndexRequest(repo: string): Promise<CoreExtensionBridgeResponse>;
}

const DEFAULT_DEPENDENCIES: IndexRepoDependencies = {
  sendIndexRequest: (repo) => sendCoreExtensionRequest({ action: 'index', repo }),
};

function graphCachePath(repo: string): string {
  return path.join(repo, '.codegraphy', 'graph.lbug');
}

export async function requestCodeGraphyIndexRepo(
  input: IndexRepoInput,
  dependencies: IndexRepoDependencies = DEFAULT_DEPENDENCIES,
): Promise<IndexRepoResult | ToolErrorResult> {
  const repo = path.resolve(input.repo);
  const result = await dependencies.sendIndexRequest(repo);

  if (result.status !== 'indexed') {
    return {
      error: 'indexing_failed',
      message: result.status === 'failed' ? result.error : 'CodeGraphy indexing did not complete.',
      repo,
    };
  }

  return {
    repo,
    graphCache: path.relative(repo, graphCachePath(repo)),
    message: 'CodeGraphy indexing completed. Query tools can now read the Graph Cache.',
  };
}
