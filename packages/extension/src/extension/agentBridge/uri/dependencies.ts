import * as fs from 'node:fs/promises';
import * as vscode from 'vscode';
import type {
  CodeGraphyAgentRequest,
  CodeGraphyAgentResponse,
  CodeGraphyAgentUriDependencies,
} from './types';

function readWorkspaceRoot(): string | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }
  return workspaceFolders[0].uri.fsPath;
}

export const DEFAULT_DEPENDENCIES: CodeGraphyAgentUriDependencies = {
  getWorkspaceRoot: readWorkspaceRoot,
  readRequestFile: async (filePath: string) =>
    JSON.parse(await fs.readFile(filePath, 'utf8')) as CodeGraphyAgentRequest,
  showErrorMessage: (message: string) => vscode.window.showErrorMessage(message),
  showWarningMessage: (message: string) => vscode.window.showWarningMessage(message),
  writeResponseFile: async (filePath: string, response: CodeGraphyAgentResponse) => {
    await fs.writeFile(filePath, `${JSON.stringify(response, null, 2)}\n`);
  },
};
