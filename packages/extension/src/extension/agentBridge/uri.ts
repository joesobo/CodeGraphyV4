import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { GraphQueryRequest, GraphQueryResult } from '../../core/graphQuery';
import type { GraphViewProvider } from '../graphViewProvider';

export type CodeGraphyAgentUriStatus =
  | 'failed'
  | 'indexed'
  | 'missing-request'
  | 'missing-workspace'
  | 'queried'
  | 'unsupported-action'
  | 'wrong-workspace';

export interface CodeGraphyAgentUriResult {
  status: CodeGraphyAgentUriStatus;
}

interface CodeGraphyAgentUriLike {
  path: string;
  query: string;
}

interface CodeGraphyAgentRequest {
  repo: string;
  requestId?: string;
  responsePath: string;
}

interface CodeGraphyAgentGraphQueryRequest extends CodeGraphyAgentRequest {
  query: GraphQueryRequest;
}

type CodeGraphyAgentResponse =
  | {
    requestId?: string;
    repo: string;
    status: 'failed';
    error: string;
  }
  | {
    requestId?: string;
    repo: string;
    status: 'indexed';
  }
  | {
    requestId?: string;
    repo: string;
    status: 'ok';
    result: GraphQueryResult;
  };

interface CodeGraphyAgentBridgeProvider {
  refreshIndex(): Promise<void>;
  queryGraph(request: GraphQueryRequest): GraphQueryResult;
}

interface CodeGraphyAgentUriDependencies {
  getWorkspaceRoot(): string | undefined;
  readRequestFile(filePath: string): Promise<CodeGraphyAgentRequest>;
  showErrorMessage(message: string): unknown;
  showWarningMessage(message: string): unknown;
  writeResponseFile(filePath: string, response: CodeGraphyAgentResponse): Promise<void>;
}

const DEFAULT_DEPENDENCIES: CodeGraphyAgentUriDependencies = {
  getWorkspaceRoot: () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
  readRequestFile: async (filePath: string) =>
    JSON.parse(await fs.readFile(filePath, 'utf8')) as CodeGraphyAgentRequest,
  showErrorMessage: (message: string) => vscode.window.showErrorMessage(message),
  showWarningMessage: (message: string) => vscode.window.showWarningMessage(message),
  writeResponseFile: async (filePath: string, response: CodeGraphyAgentResponse) => {
    await fs.writeFile(filePath, `${JSON.stringify(response, null, 2)}\n`, 'utf8');
  },
};

function normalizeFsPath(fsPath: string): string {
  const resolvedPath = path.resolve(fsPath);
  return process.platform === 'win32' ? resolvedPath.toLowerCase() : resolvedPath;
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readRequestPath(uri: CodeGraphyAgentUriLike): string | undefined {
  return new URLSearchParams(uri.query).get('request') ?? undefined;
}

async function writeFailureResponse(
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

async function readAgentRequest(
  uri: CodeGraphyAgentUriLike,
  dependencies: CodeGraphyAgentUriDependencies,
): Promise<CodeGraphyAgentRequest | undefined> {
  const requestPath = readRequestPath(uri);
  if (!requestPath) {
    dependencies.showWarningMessage('CodeGraphy agent request did not include a request file.');
    return undefined;
  }

  return dependencies.readRequestFile(requestPath);
}

function isWrongWorkspace(requestedRepo: string, workspaceRoot: string | undefined): boolean {
  return !workspaceRoot || normalizeFsPath(workspaceRoot) !== normalizeFsPath(requestedRepo);
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

export async function handleCodeGraphyAgentUri(
  uri: CodeGraphyAgentUriLike,
  provider: CodeGraphyAgentBridgeProvider,
  dependencies: CodeGraphyAgentUriDependencies = DEFAULT_DEPENDENCIES,
): Promise<CodeGraphyAgentUriResult> {
  if (uri.path !== '/index' && uri.path !== '/query') {
    dependencies.showWarningMessage(`CodeGraphy ignored unsupported agent request: ${uri.path || '/'}.`);
    return { status: 'unsupported-action' };
  }

  const request = await readAgentRequest(uri, dependencies);
  if (!request) {
    return { status: 'missing-request' };
  }

  const workspaceRoot = dependencies.getWorkspaceRoot();
  if (!workspaceRoot) {
    await writeFailureResponse(
      request,
      `CodeGraphy agent request for ${request.repo} needs a VS Code window opened on that repo.`,
      dependencies,
    );
    return { status: 'missing-workspace' };
  }

  if (isWrongWorkspace(request.repo, workspaceRoot)) {
    const message = `CodeGraphy agent request targeted ${request.repo}, but this VS Code window is indexing ${workspaceRoot}. Open the target repo window and retry.`;
    await writeFailureResponse(request, message, dependencies);
    dependencies.showWarningMessage(message);
    return { status: 'wrong-workspace' };
  }

  return uri.path === '/index'
    ? handleIndexRequest(request, provider, dependencies)
    : handleQueryRequest(request, provider, dependencies);
}

export function createCodeGraphyAgentUriHandler(
  provider: Pick<GraphViewProvider, 'queryGraph' | 'refreshIndex'>,
): vscode.UriHandler {
  return {
    handleUri: async (uri: vscode.Uri): Promise<void> => {
      await handleCodeGraphyAgentUri(uri, provider);
    },
  };
}
