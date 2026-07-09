import * as vscode from 'vscode';
import type { GraphViewProvider } from '../../graphViewProvider';
import {
  armWorkspaceRefreshIdleWait,
  type ArmedWorkspaceRefreshIdleWait,
} from '../../workspaceFiles/refresh/scheduler';
import { createPerfOperation } from '../operationId';
import { createPerfFixtureTargets } from '../fixtures/targets';
import type { PerfScenarioOperationRunner } from './contracts';

const generatedTargets = createPerfFixtureTargets('small');
export const PERF_SAVE_TARGET_RELATIVE_PATH = generatedTargets.savePath;
export const PERF_SAVE_MARKER = generatedTargets.saveMarker;
const workspaceRefreshTimeoutMs = 30_000;

export interface RunDocumentSaveScenarioInput {
  dimension: string;
  ordinal: number;
  provider: GraphViewProvider;
  runId: string;
  runOperation: PerfScenarioOperationRunner;
  workspaceFolderUri: vscode.Uri;
}

export interface DocumentSaveScenarioDependencies {
  armWorkspaceRefreshIdleWait(
    provider: GraphViewProvider,
    options: { quietMs: number; timeoutMs: number },
  ): ArmedWorkspaceRefreshIdleWait;
  executeCommand(command: string): PromiseLike<unknown>;
  getActiveTextEditor(): vscode.TextEditor | undefined;
  getOpenTextDocuments(): readonly vscode.TextDocument[];
  openTextDocument(uri: vscode.Uri): PromiseLike<vscode.TextDocument>;
  showTextDocument(
    document: vscode.TextDocument,
    options?: vscode.TextDocumentShowOptions,
  ): PromiseLike<vscode.TextEditor>;
}

export interface DocumentSaveScenarioResult {
  dimension: string;
  operationId: string;
  restored: true;
  scenario: 'single-save';
  targetPath: string;
}

const defaultDependencies: DocumentSaveScenarioDependencies = {
  armWorkspaceRefreshIdleWait,
  executeCommand: command => vscode.commands.executeCommand(command),
  getActiveTextEditor: () => vscode.window.activeTextEditor,
  getOpenTextDocuments: () => vscode.workspace.textDocuments,
  openTextDocument: uri => vscode.workspace.openTextDocument(uri),
  showTextDocument: (document, options) => vscode.window.showTextDocument(document, options),
};

function isTargetDocument(document: vscode.TextDocument, targetUri: vscode.Uri): boolean {
  return document.uri.fsPath === targetUri.fsPath;
}

async function saveDocumentMutation(
  document: vscode.TextDocument,
  editor: vscode.TextEditor,
  marker: string,
  input: RunDocumentSaveScenarioInput,
  dependencies: DocumentSaveScenarioDependencies,
): Promise<void> {
  const changed = await editor.edit((builder) => {
    builder.insert(
      document.positionAt(document.getText().length),
      marker,
    );
  });
  if (!changed) {
    throw new Error(`Unable to edit performance save target ${document.uri.fsPath}`);
  }
  await saveDocumentAndWaitForRefresh(
    document,
    input,
    dependencies,
    `Unable to save performance target ${document.uri.fsPath}`,
  );
}

async function saveDocumentAndWaitForRefresh(
  document: vscode.TextDocument,
  input: RunDocumentSaveScenarioInput,
  dependencies: DocumentSaveScenarioDependencies,
  failureMessage: string,
): Promise<void> {
  const refreshIdle = dependencies.armWorkspaceRefreshIdleWait(
    input.provider,
    { quietMs: 32, timeoutMs: workspaceRefreshTimeoutMs },
  );
  try {
    if (!await document.save()) {
      throw new Error(failureMessage);
    }
    await refreshIdle.promise;
  } finally {
    refreshIdle.dispose();
  }
}

async function restoreDocumentContent(
  document: vscode.TextDocument,
  originalContent: string,
  input: RunDocumentSaveScenarioInput,
  dependencies: DocumentSaveScenarioDependencies,
): Promise<void> {
  const editor = await dependencies.showTextDocument(document, {
    preserveFocus: false,
    preview: false,
  });
  const changed = document.getText() !== originalContent;

  if (changed) {
    const replaced = await editor.edit((builder) => {
      builder.replace(
        new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length),
        ),
        originalContent,
      );
    });
    if (!replaced) {
      throw new Error(`Unable to restore performance save target ${document.uri.fsPath}`);
    }
  }

  if (changed || document.isDirty) {
    await saveDocumentAndWaitForRefresh(
      document,
      input,
      dependencies,
      `Unable to save restored performance target ${document.uri.fsPath}`,
    );
  }

  if (document.getText() !== originalContent || document.isDirty) {
    throw new Error(`Performance save scenario did not restore ${document.uri.fsPath}`);
  }
}

async function restoreDocumentPresentation(
  targetDocument: vscode.TextDocument,
  targetWasOpen: boolean,
  originalActiveEditor: vscode.TextEditor | undefined,
  dependencies: DocumentSaveScenarioDependencies,
): Promise<void> {
  if (!targetWasOpen) {
    await dependencies.showTextDocument(targetDocument, {
      preserveFocus: false,
      preview: false,
    });
    await dependencies.executeCommand('workbench.action.closeActiveEditor');
  }

  if (originalActiveEditor && !isTargetDocument(
    originalActiveEditor.document,
    targetDocument.uri,
  )) {
    await dependencies.showTextDocument(originalActiveEditor.document, {
      preserveFocus: false,
      preview: false,
      viewColumn: originalActiveEditor.viewColumn,
    });
  }
}

export async function runDocumentSaveScenario(
  input: RunDocumentSaveScenarioInput,
  dependencies: DocumentSaveScenarioDependencies = defaultDependencies,
): Promise<DocumentSaveScenarioResult> {
  const operation = createPerfOperation({
    runId: input.runId,
    scenario: 'single-save',
    dimension: input.dimension,
    ordinal: input.ordinal,
  });
  const targets = createPerfFixtureTargets(input.dimension);
  const targetUri = vscode.Uri.joinPath(
    input.workspaceFolderUri,
    ...targets.savePath.split('/'),
  );
  const targetWasOpen = dependencies.getOpenTextDocuments()
    .some(document => isTargetDocument(document, targetUri));
  const originalActiveEditor = dependencies.getActiveTextEditor();
  const document = await dependencies.openTextDocument(targetUri);
  if (document.isDirty) {
    await restoreDocumentPresentation(
      document,
      targetWasOpen,
      originalActiveEditor,
      dependencies,
    );
    throw new Error(`Performance save target is already dirty: ${document.uri.fsPath}`);
  }
  const originalContent = document.getText();

  try {
    const editor = await dependencies.showTextDocument(document, {
      preserveFocus: false,
      preview: false,
    });
    await input.runOperation(operation, async () => {
      await saveDocumentMutation(
        document,
        editor,
        targets.saveMarker,
        input,
        dependencies,
      );
    });
  } finally {
    let restoredDocument = document;
    try {
      restoredDocument = await dependencies.openTextDocument(targetUri);
      await restoreDocumentContent(
        restoredDocument,
        originalContent,
        input,
        dependencies,
      );
    } finally {
      await restoreDocumentPresentation(
        restoredDocument,
        targetWasOpen,
        originalActiveEditor,
        dependencies,
      );
    }
  }

  return {
    dimension: input.dimension,
    operationId: operation.operationId,
    restored: true,
    scenario: 'single-save',
    targetPath: targets.savePath,
  };
}
