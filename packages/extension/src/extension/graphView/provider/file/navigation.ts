import * as vscode from 'vscode';
import {
  copyGraphViewTextToClipboard,
  openGraphViewFile,
  revealGraphViewFileInExplorer,
  type GraphViewEditorOpenBehavior,
} from '../../files/navigation';

export interface GraphViewProviderFileNavigationSource {
  _incrementVisitCount(filePath: string): Promise<void>;
}

export interface GraphViewProviderFileNavigationDependencies {
  getWorkspaceFolder(): { uri: vscode.Uri } | undefined;
  showInformationMessage(message: string): void;
  showErrorMessage(message: string): void;
  statFile(fileUri: vscode.Uri): PromiseLike<unknown>;
  openTextDocument(fileUri: vscode.Uri): PromiseLike<vscode.TextDocument>;
  showTextDocument(
    document: vscode.TextDocument,
    behavior: GraphViewEditorOpenBehavior,
  ): PromiseLike<unknown>;
  openFile: typeof openGraphViewFile;
  revealFile: typeof revealGraphViewFileInExplorer;
  writeText(text: string): PromiseLike<void>;
  copyText: typeof copyGraphViewTextToClipboard;
  logError(label: string, error: unknown): void;
}

function createDefaultGraphViewProviderFileNavigationDependencies(): GraphViewProviderFileNavigationDependencies {
  return {
    getWorkspaceFolder: () => vscode.workspace.workspaceFolders?.[0],
    showInformationMessage: message => {
      vscode.window.showInformationMessage(message);
    },
    showErrorMessage: message => {
      vscode.window.showErrorMessage(message);
    },
    statFile: fileUri => vscode.workspace.fs.stat(fileUri),
    openTextDocument: fileUri => vscode.workspace.openTextDocument(fileUri),
    showTextDocument: (document, behavior) => vscode.window.showTextDocument(document, behavior),
    openFile: openGraphViewFile,
    revealFile: revealGraphViewFileInExplorer,
    writeText: text => vscode.env.clipboard.writeText(text),
    copyText: copyGraphViewTextToClipboard,
    logError: (label, error) => {
      console.error(label, error);
    },
  };
}

export async function openGraphViewProviderFile(
  source: GraphViewProviderFileNavigationSource,
  filePath: string,
  behavior: GraphViewEditorOpenBehavior,
  dependencies?: GraphViewProviderFileNavigationDependencies,
): Promise<void> {
  const resolvedDependencies =
    dependencies ?? createDefaultGraphViewProviderFileNavigationDependencies();

  await resolvedDependencies.openFile(
    filePath,
    {
      workspaceFolder: resolvedDependencies.getWorkspaceFolder(),
      showInformationMessage: message => {
        resolvedDependencies.showInformationMessage(message);
      },
      showErrorMessage: message => {
        resolvedDependencies.showErrorMessage(message);
      },
      statFile: fileUri => resolvedDependencies.statFile(fileUri),
      openTextDocument: fileUri => resolvedDependencies.openTextDocument(fileUri),
      showTextDocument: (document, nextBehavior) =>
        resolvedDependencies.showTextDocument(document, nextBehavior),
      incrementVisitCount: nextFilePath => source._incrementVisitCount(nextFilePath),
      logError: (label, error) => {
        resolvedDependencies.logError(label, error);
      },
    },
    behavior,
  );
}

export async function revealGraphViewProviderFileInExplorer(
  filePath: string,
  dependencies?: Pick<
    GraphViewProviderFileNavigationDependencies,
    'getWorkspaceFolder' | 'revealFile'
  >,
): Promise<void> {
  const resolvedDependencies =
    dependencies ?? createDefaultGraphViewProviderFileNavigationDependencies();

  await resolvedDependencies.revealFile(filePath, {
    workspaceFolder: resolvedDependencies.getWorkspaceFolder(),
    executeCommand: (command, ...args) => vscode.commands.executeCommand(command, ...args),
  });
}

export async function copyGraphViewProviderTextToClipboard(
  text: string,
  dependencies?: Pick<
    GraphViewProviderFileNavigationDependencies,
    'getWorkspaceFolder' | 'writeText' | 'copyText'
  >,
): Promise<void> {
  const resolvedDependencies =
    dependencies ?? createDefaultGraphViewProviderFileNavigationDependencies();

  await resolvedDependencies.copyText(text, {
    workspaceFolder: resolvedDependencies.getWorkspaceFolder(),
    writeText: value => resolvedDependencies.writeText(value),
  });
}
