import { normalizeAgentRepoPath } from './paths';
import { writeFailureResponse } from './response';
import type {
  CodeGraphyAgentRequest,
  CodeGraphyAgentUriDependencies,
  CodeGraphyAgentUriResult,
} from './types';

function hasWrongWorkspace(requestedRepo: string, workspaceRoot: string): boolean {
  return normalizeAgentRepoPath(workspaceRoot) !== normalizeAgentRepoPath(requestedRepo);
}

export async function guardWorkspaceRequest(
  request: CodeGraphyAgentRequest,
  dependencies: CodeGraphyAgentUriDependencies,
): Promise<CodeGraphyAgentUriResult | undefined> {
  const workspaceRoot = dependencies.getWorkspaceRoot();
  if (!workspaceRoot) {
    await writeFailureResponse(
      request,
      `CodeGraphy agent request for ${request.repo} needs a VS Code window opened on that repo.`,
      dependencies,
    );
    return { status: 'missing-workspace' };
  }

  if (hasWrongWorkspace(request.repo, workspaceRoot)) {
    const message = `CodeGraphy agent request targeted ${request.repo}, but this VS Code window is indexing ${workspaceRoot}. Open the target repo window and retry.`;
    await writeFailureResponse(request, message, dependencies);
    dependencies.showWarningMessage(message);
    return { status: 'wrong-workspace' };
  }

  return undefined;
}
