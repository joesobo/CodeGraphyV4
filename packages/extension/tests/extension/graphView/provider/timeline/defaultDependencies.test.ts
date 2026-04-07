import * as vscode from 'vscode';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultGraphViewProviderTimelineMethodDependencies } from '../../../../../src/extension/graphView/provider/timeline/defaultDependencies';
import { GitHistoryAnalyzer } from '../../../../../src/extension/gitHistory/analyzer';

describe('graphView/provider/timeline defaultDependencies', () => {
  let originalOpenTextDocument: unknown;
  let originalShowTextDocument: unknown;

  beforeEach(() => {
    originalOpenTextDocument = (vscode.workspace as { openTextDocument?: unknown }).openTextDocument;
    originalShowTextDocument = (vscode.window as { showTextDocument?: unknown }).showTextDocument;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalOpenTextDocument === undefined) {
      delete (vscode.workspace as { openTextDocument?: unknown }).openTextDocument;
    } else {
      Object.defineProperty(vscode.workspace, 'openTextDocument', {
        configurable: true,
        value: originalOpenTextDocument,
      });
    }
    if (originalShowTextDocument === undefined) {
      delete (vscode.window as { showTextDocument?: unknown }).showTextDocument;
    } else {
      Object.defineProperty(vscode.window, 'showTextDocument', {
        configurable: true,
        value: originalShowTextDocument,
      });
    }
  });

  it('reads the playback speed and workspace folder from vscode', () => {
    const get = vi.fn((key: string, fallback: unknown) =>
      key === 'timeline.playbackSpeed' ? 1.5 : fallback,
    );
    const getConfiguration = vi
      .spyOn(vscode.workspace, 'getConfiguration')
      .mockReturnValue({ get } as never);
    vi.spyOn(vscode.workspace, 'workspaceFolders', 'get').mockReturnValue([
      { uri: { fsPath: '/workspace' }, name: 'workspace', index: 0 } as never,
    ]);

    const dependencies = createDefaultGraphViewProviderTimelineMethodDependencies();

    expect(dependencies.getPlaybackSpeed()).toBe(1.5);
    expect(dependencies.getWorkspaceFolder()).toEqual(
      expect.objectContaining({
        uri: { fsPath: '/workspace' },
        name: 'workspace',
        index: 0,
      }),
    );
    expect(getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(get).toHaveBeenCalledWith('timeline.playbackSpeed', 1.0);
  });

  it('delegates document opening and error logging to vscode and console', async () => {
    const uri = vscode.Uri.file('/workspace/src/app.ts');
    const document = { uri } as vscode.TextDocument;
    const editor = {} as vscode.TextEditor;
    const openTextDocument = vi.fn(async () => document);
    const showTextDocument = vi.fn(async () => editor);
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    Object.defineProperty(vscode.workspace, 'openTextDocument', {
      configurable: true,
      value: openTextDocument,
    });
    Object.defineProperty(vscode.window, 'showTextDocument', {
      configurable: true,
      value: showTextDocument,
    });

    const dependencies = createDefaultGraphViewProviderTimelineMethodDependencies();

    expect(await dependencies.openTextDocument(uri)).toBe(document);
    expect(await dependencies.showTextDocument(document, { preview: true, preserveFocus: false })).toBe(editor);
    dependencies.logError('preview failed', 'boom');

    expect(openTextDocument).toHaveBeenCalledWith(uri);
    expect(showTextDocument).toHaveBeenCalledWith(document, { preview: true, preserveFocus: false });
    expect(logError).toHaveBeenCalledWith('preview failed', 'boom');
  });

  it('returns no workspace folder when vscode has none and creates git analyzers', () => {
    vi.spyOn(vscode.workspace, 'workspaceFolders', 'get').mockReturnValue(undefined);
    const dependencies = createDefaultGraphViewProviderTimelineMethodDependencies();

    expect(dependencies.getWorkspaceFolder()).toBeUndefined();

    const analyzer = dependencies.createGitAnalyzer?.(
      { storageUri: undefined } as never,
      { get: vi.fn() } as never,
      '/workspace',
      ['dist/**'],
    );

    expect(analyzer).toBeInstanceOf(GitHistoryAnalyzer);
  });
});
