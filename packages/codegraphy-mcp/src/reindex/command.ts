import { requestCodeGraphyReindex, type ReindexRequestInput, type ReindexRequestResult } from './request';

export interface ReindexCommandResult {
  exitCode: number;
  output: string;
}

interface ReindexCommandDependencies {
  requestCodeGraphyReindex(input: ReindexRequestInput): Promise<ReindexRequestResult>;
}

const DEFAULT_DEPENDENCIES: ReindexCommandDependencies = {
  requestCodeGraphyReindex,
};

function createOutput(result: ReindexRequestResult): string {
  const lines = [
    `repo: ${result.repo}`,
    `status: ${result.status}`,
    `freshness: ${result.after.freshness}`,
    `requestId: ${result.requestId}`,
    `uri: ${result.uri}`,
    `waited: ${result.waited}`,
    `timeoutMs: ${result.timeoutMs}`,
    `detail: ${result.after.detail}`,
  ];

  for (const limitation of result.limitations) {
    lines.push(`warning: ${limitation}`);
  }

  return lines.join('\n');
}

function isSuccessfulStatus(status: ReindexRequestResult['status']): boolean {
  return status === 'fresh' || status === 'requested';
}

export async function runReindexCommand(
  repoPath = process.cwd(),
  dependencies: ReindexCommandDependencies = DEFAULT_DEPENDENCIES,
): Promise<ReindexCommandResult> {
  const result = await dependencies.requestCodeGraphyReindex({ repoPath });

  return {
    exitCode: isSuccessfulStatus(result.status) ? 0 : 1,
    output: createOutput(result),
  };
}
