import { describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';

import {
  PERF_SAVE_MARKER,
  PERF_SAVE_TARGET_RELATIVE_PATH,
  runDocumentSaveScenario,
  type DocumentSaveScenarioDependencies,
} from '../../../../src/extension/perf/scenarios/save';
import type { PerfScenarioOperationRunner } from '../../../../src/extension/perf/scenarios/contracts';

const originalContent = 'export const file_000000 = 0;\n';

function uri(fsPath: string): vscode.Uri {
  return { fsPath, path: fsPath } as vscode.Uri;
}

function setup() {
  let content = originalContent;
  let dirty = false;
  let activeDocument = '/workspace/src/previous.ts';
  const savedContents: string[] = [];
  const targetUri = uri('/workspace/src/group-00000/file-000000.ts');
  const previousDocument = { uri: uri(activeDocument) } as vscode.TextDocument;
  const document = {
    get isDirty() { return dirty; },
    getText: () => content,
    positionAt: (offset: number) => offset as unknown as vscode.Position,
    save: vi.fn(async () => {
      savedContents.push(content);
      dirty = false;
      return true;
    }),
    uri: targetUri,
  } as unknown as vscode.TextDocument;
  const editor = {
    document,
    edit: vi.fn(async (callback: (builder: vscode.TextEditorEdit) => void) => {
      callback({
        insert: (_position, text) => {
          content += text;
          dirty = true;
        },
        replace: (_range, text) => {
          content = text;
          dirty = true;
        },
      } as vscode.TextEditorEdit);
      return true;
    }),
  } as unknown as vscode.TextEditor;
  const previousEditor = {
    document: previousDocument,
    viewColumn: 1,
  } as vscode.TextEditor;
  const openDocuments: vscode.TextDocument[] = [previousDocument];
  const waitForWorkspaceRefreshIdle = vi.fn(async () => undefined);
  const executeCommand = vi.fn(async (command: string) => {
    if (command === 'workbench.action.closeActiveEditor') {
      const targetIndex = openDocuments.indexOf(document);
      if (targetIndex >= 0) openDocuments.splice(targetIndex, 1);
      activeDocument = '';
    }
  });
  const openTextDocument = vi.fn(async () => {
    if (!openDocuments.includes(document)) openDocuments.push(document);
    return document;
  });
  const dependencies: DocumentSaveScenarioDependencies = {
    executeCommand,
    getActiveTextEditor: () => activeDocument === previousDocument.uri.fsPath
      ? previousEditor
      : activeDocument === targetUri.fsPath
        ? editor
        : undefined,
    getOpenTextDocuments: () => openDocuments,
    openTextDocument,
    showTextDocument: vi.fn(async (nextDocument) => {
      activeDocument = nextDocument.uri.fsPath;
      return nextDocument === document ? editor : previousEditor;
    }),
    waitForWorkspaceRefreshIdle,
  };

  return {
    activeDocument: () => activeDocument,
    content: () => content,
    dependencies,
    document,
    executeCommand,
    openTextDocument,
    savedContents,
    targetUri,
    waitForWorkspaceRefreshIdle,
  };
}

describe('extension/perf/scenarios/save', () => {
  it('saves a deterministic document through a correlated operation', async () => {
    const harness = setup();
    const runOperation: PerfScenarioOperationRunner = vi.fn(async (operation, action) => {
      expect(operation).toEqual({
        operationId: 'run-1:single-save:medium:2',
        runId: 'run-1',
        scenario: 'single-save',
        dimension: 'medium',
      });
      await action();
      expect(harness.savedContents[0]).toBe(originalContent + PERF_SAVE_MARKER);
      return { operation: 'complete' };
    });

    const result = await runDocumentSaveScenario({
      dimension: 'medium',
      ordinal: 2,
      provider: {} as never,
      runId: 'run-1',
      runOperation,
      workspaceFolderUri: uri('/workspace'),
    }, harness.dependencies);

    expect(result).toEqual({
      dimension: 'medium',
      operationId: 'run-1:single-save:medium:2',
      restored: true,
      scenario: 'single-save',
      targetPath: PERF_SAVE_TARGET_RELATIVE_PATH,
    });
    expect(harness.openTextDocument).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        fsPath: `/workspace/${PERF_SAVE_TARGET_RELATIVE_PATH}`,
      }),
    );
    expect(harness.waitForWorkspaceRefreshIdle).toHaveBeenCalledTimes(2);
    expect(harness.waitForWorkspaceRefreshIdle).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      { quietMs: 32 },
    );
    expect(harness.savedContents).toEqual([
      originalContent + PERF_SAVE_MARKER,
      originalContent,
    ]);
    expect(harness.content()).toBe(originalContent);
    expect(harness.executeCommand).toHaveBeenCalledWith('workbench.action.closeActiveEditor');
    expect(harness.activeDocument()).toBe('/workspace/src/previous.ts');
  });

  it('restores document state when the correlated operation fails', async () => {
    const harness = setup();
    const runOperation: PerfScenarioOperationRunner = async (_operation, action) => {
      await action();
      throw new Error('acknowledgement failed');
    };

    await expect(runDocumentSaveScenario({
      dimension: 'small',
      ordinal: 0,
      provider: {} as never,
      runId: 'run-failure',
      runOperation,
      workspaceFolderUri: uri('/workspace'),
    }, harness.dependencies)).rejects.toThrow('acknowledgement failed');

    expect(harness.content()).toBe(originalContent);
    expect(harness.savedContents.at(-1)).toBe(originalContent);
    expect(harness.executeCommand).toHaveBeenCalledWith('workbench.action.closeActiveEditor');
    expect(harness.activeDocument()).toBe('/workspace/src/previous.ts');
  });
});
