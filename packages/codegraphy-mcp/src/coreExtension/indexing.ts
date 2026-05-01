import * as path from 'node:path';
import { requestCodeGraphyReindex, type ReindexRequestResult } from '../reindex/request';
import type { IndexRepoInput, IndexRepoResult, ToolErrorResult } from './model';

export interface IndexRepoDependencies {
  requestIndex(repo: string): Promise<ReindexRequestResult>;
}

const DEFAULT_DEPENDENCIES: IndexRepoDependencies = {
  requestIndex: (repo) => requestCodeGraphyReindex({ repoPath: repo }),
};

function graphCachePath(repo: string): string {
  return path.join(repo, '.codegraphy', 'graph.lbug');
}

export async function requestCodeGraphyIndexRepo(
  input: IndexRepoInput,
  dependencies: IndexRepoDependencies = DEFAULT_DEPENDENCIES,
): Promise<IndexRepoResult | ToolErrorResult> {
  const repo = path.resolve(input.repo);
  const result = await dependencies.requestIndex(repo);

  if (result.status !== 'fresh') {
    return {
      error: 'indexing_failed',
      message: result.limitations[0] ?? 'CodeGraphy indexing did not complete.',
      repo,
    };
  }

  return {
    repo,
    graphCache: path.relative(repo, graphCachePath(repo)),
    message: 'CodeGraphy indexing completed. Query tools can now read the Graph Cache.',
  };
}
