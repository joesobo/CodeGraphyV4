import {
  executeCodeGraphyWorkspaceCommand,
  type CodeGraphyWorkspaceCommand,
} from '@codegraphy-dev/core';
import type {
  CodeGraphyAgentAction,
  CodeGraphyAgentBridgeProvider,
  CodeGraphyAgentRequest,
  CodeGraphyAgentUriDependencies,
  CodeGraphyAgentUriResult,
} from './types';

function createWorkspaceCommand(
  action: CodeGraphyAgentAction,
  request: CodeGraphyAgentRequest,
): CodeGraphyWorkspaceCommand {
  if (action === 'query') {
    if (!request.query) {
      throw new Error('CodeGraphy query request did not include a Graph Query.');
    }
    return {
      command: action,
      workspacePath: request.repo,
      query: request.query,
    };
  }
  return {
    command: action,
    workspacePath: request.repo,
  };
}

function successStatus(action: CodeGraphyAgentAction): CodeGraphyAgentUriResult {
  if (action === 'index') return { status: 'indexed' };
  if (action === 'query') return { status: 'queried' };
  return { status: 'status-read' };
}

export async function dispatchAgentAction(
  action: CodeGraphyAgentAction,
  request: CodeGraphyAgentRequest,
  provider: CodeGraphyAgentBridgeProvider,
  dependencies: CodeGraphyAgentUriDependencies,
): Promise<CodeGraphyAgentUriResult> {
  const execute = dependencies.executeWorkspaceCommand ?? executeCodeGraphyWorkspaceCommand;
  const response = await execute(createWorkspaceCommand(action, request));
  await dependencies.writeResponseFile(request.responsePath, {
    requestId: request.requestId,
    repo: request.repo,
    response,
  });

  if (!response.ok) {
    dependencies.showErrorMessage(
      `CodeGraphy ${action} failed for ${request.repo}: ${response.error.message}`,
    );
    return { status: 'failed' };
  }

  if (action === 'index') {
    await provider.refresh();
  }
  return successStatus(action);
}
