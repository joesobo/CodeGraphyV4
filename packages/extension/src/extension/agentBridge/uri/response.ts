import type {
  CodeGraphyAgentRequest,
  CodeGraphyAgentUriDependencies,
} from './types';

export async function writeFailureResponse(
  request: CodeGraphyAgentRequest,
  error: string,
  dependencies: CodeGraphyAgentUriDependencies,
): Promise<void> {
  await dependencies.writeResponseFile(request.responsePath, {
    requestId: request.requestId,
    repo: request.repo,
    status: 'failed',
    error,
  });
}
