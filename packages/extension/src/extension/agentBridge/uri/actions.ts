import type {
  CodeGraphyAgentAction,
  CodeGraphyAgentBridgeProvider,
  CodeGraphyAgentGraphQueryRequest,
  CodeGraphyAgentRequest,
  CodeGraphyAgentUriDependencies,
  CodeGraphyAgentUriResult,
} from './types';
import { writeFailureResponse } from './response';

export function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function handleIndexRequest(
  request: CodeGraphyAgentRequest,
  provider: CodeGraphyAgentBridgeProvider,
  dependencies: CodeGraphyAgentUriDependencies,
): Promise<CodeGraphyAgentUriResult> {
  try {
    await provider.refreshIndex();
    await dependencies.writeResponseFile(request.responsePath, {
      requestId: request.requestId,
      repo: request.repo,
      status: 'indexed',
    });
    return { status: 'indexed' };
  } catch (error) {
    const message = formatErrorMessage(error);
    await writeFailureResponse(request, message, dependencies);
    dependencies.showErrorMessage(`CodeGraphy failed to index ${request.repo}: ${message}`);
    return { status: 'failed' };
  }
}

async function handleQueryRequest(
  request: CodeGraphyAgentRequest,
  provider: CodeGraphyAgentBridgeProvider,
  dependencies: CodeGraphyAgentUriDependencies,
): Promise<CodeGraphyAgentUriResult> {
  try {
    const result = provider.queryGraph((request as CodeGraphyAgentGraphQueryRequest).query);
    await dependencies.writeResponseFile(request.responsePath, {
      requestId: request.requestId,
      repo: request.repo,
      status: 'ok',
      result,
    });
    return { status: 'queried' };
  } catch (error) {
    const message = formatErrorMessage(error);
    await writeFailureResponse(request, message, dependencies);
    dependencies.showErrorMessage(`CodeGraphy failed to query ${request.repo}: ${message}`);
    return { status: 'failed' };
  }
}

export function dispatchAgentAction(
  action: CodeGraphyAgentAction,
  request: CodeGraphyAgentRequest,
  provider: CodeGraphyAgentBridgeProvider,
  dependencies: CodeGraphyAgentUriDependencies,
): Promise<CodeGraphyAgentUriResult> {
  return action === 'index'
    ? handleIndexRequest(request, provider, dependencies)
    : handleQueryRequest(request, provider, dependencies);
}
