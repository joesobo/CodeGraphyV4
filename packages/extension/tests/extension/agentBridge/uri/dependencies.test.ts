import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DEPENDENCIES } from '../../../../src/extension/agentBridge/uri/dependencies';

describe('agentBridge/uri/dependencies', () => {
  const originalWorkspaceFolders = vscode.workspace.workspaceFolders;
  let workspaceFolders = originalWorkspaceFolders;

  Object.defineProperty(vscode.workspace, 'workspaceFolders', {
    configurable: true,
    get: () => workspaceFolders,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    workspaceFolders = originalWorkspaceFolders;
  });

  it('reads the first workspace root from VS Code', () => {
    workspaceFolders = [
      { uri: { fsPath: '/workspace/project' }, name: 'project', index: 0 },
    ] as unknown as typeof vscode.workspace.workspaceFolders;

    expect(DEFAULT_DEPENDENCIES.getWorkspaceRoot()).toBe('/workspace/project');
  });

  it('returns undefined when VS Code has no workspace folders', () => {
    workspaceFolders = undefined;

    expect(DEFAULT_DEPENDENCIES.getWorkspaceRoot()).toBeUndefined();
  });

  it('returns undefined when VS Code has an empty workspace folder list', () => {
    workspaceFolders = [];

    expect(DEFAULT_DEPENDENCIES.getWorkspaceRoot()).toBeUndefined();
  });

  it('round-trips agent request and response files as formatted JSON', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-agent-uri-'));
    const requestPath = path.join(tempDirectory, 'request.json');
    const responsePath = path.join(tempDirectory, 'response.json');

    await fs.writeFile(
      requestPath,
      JSON.stringify({
        repo: '/workspace/project',
        requestId: 'request-1',
        responsePath,
      }),
      'utf8',
    );

    await expect(DEFAULT_DEPENDENCIES.readRequestFile(requestPath)).resolves.toEqual({
      repo: '/workspace/project',
      requestId: 'request-1',
      responsePath,
    });

    await DEFAULT_DEPENDENCIES.writeResponseFile(responsePath, {
      repo: '/workspace/project',
      requestId: 'request-1',
      status: 'indexed',
    });

    await expect(fs.readFile(responsePath, 'utf8')).resolves.toBe(
      '{\n  "repo": "/workspace/project",\n  "requestId": "request-1",\n  "status": "indexed"\n}\n',
    );
  });

  it('routes messages through the VS Code window adapter', () => {
    DEFAULT_DEPENDENCIES.showErrorMessage('error text');
    DEFAULT_DEPENDENCIES.showWarningMessage('warning text');

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('error text');
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('warning text');
  });
});
