import * as path from 'node:path';
import * as vscode from 'vscode';
import type { GraphViewProvider } from '../graphViewProvider';

export type CodeGraphyAgentUriStatus =
  | 'failed'
  | 'missing-repo'
  | 'missing-workspace'
  | 'reindexed'
  | 'unsupported-action'
  | 'wrong-workspace';

export interface CodeGraphyAgentUriResult {
  status: CodeGraphyAgentUriStatus;
}

interface CodeGraphyAgentUriLike {
  path: string;
  query: string;
}

interface CodeGraphyAgentReindexProvider {
  refreshIndex(): Promise<void>;
}

interface CodeGraphyAgentUriDependencies {
  getWorkspaceRoot(): string | undefined;
  showWarningMessage(message: string): unknown;
  showErrorMessage(message: string): unknown;
}

const DEFAULT_DEPENDENCIES: CodeGraphyAgentUriDependencies = {
  getWorkspaceRoot: () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
  showWarningMessage: (message: string) => vscode.window.showWarningMessage(message),
  showErrorMessage: (message: string) => vscode.window.showErrorMessage(message),
};

function normalizeFsPath(fsPath: string): string {
  const resolvedPath = path.resolve(fsPath);
  return process.platform === 'win32' ? resolvedPath.toLowerCase() : resolvedPath;
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readRequestedRepo(uri: CodeGraphyAgentUriLike): string | undefined {
  return new URLSearchParams(uri.query).get('repo') ?? undefined;
}

export async function handleCodeGraphyAgentUri(
  uri: CodeGraphyAgentUriLike,
  provider: CodeGraphyAgentReindexProvider,
  dependencies: CodeGraphyAgentUriDependencies = DEFAULT_DEPENDENCIES,
): Promise<CodeGraphyAgentUriResult> {
  if (uri.path !== '/reindex') {
    dependencies.showWarningMessage(`CodeGraphy ignored unsupported agent request: ${uri.path || '/'}.`);
    return { status: 'unsupported-action' };
  }

  const requestedRepo = readRequestedRepo(uri);
  if (!requestedRepo) {
    dependencies.showWarningMessage('CodeGraphy reindex request did not include a repo path.');
    return { status: 'missing-repo' };
  }

  const workspaceRoot = dependencies.getWorkspaceRoot();
  if (!workspaceRoot) {
    dependencies.showWarningMessage(
      `CodeGraphy reindex request for ${requestedRepo} needs a VS Code window opened on that repo.`,
    );
    return { status: 'missing-workspace' };
  }

  if (normalizeFsPath(workspaceRoot) !== normalizeFsPath(requestedRepo)) {
    dependencies.showWarningMessage(
      `CodeGraphy reindex request targeted ${requestedRepo}, but this VS Code window is indexing ${workspaceRoot}. Open the target repo window and retry.`,
    );
    return { status: 'wrong-workspace' };
  }

  try {
    await provider.refreshIndex();
    return { status: 'reindexed' };
  } catch (error) {
    dependencies.showErrorMessage(
      `CodeGraphy failed to reindex ${requestedRepo}: ${formatErrorMessage(error)}`,
    );
    return { status: 'failed' };
  }
}

export function createCodeGraphyAgentUriHandler(
  provider: Pick<GraphViewProvider, 'refreshIndex'>,
): vscode.UriHandler {
  return {
    handleUri: async (uri: vscode.Uri): Promise<void> => {
      await handleCodeGraphyAgentUri(uri, provider);
    },
  };
}
