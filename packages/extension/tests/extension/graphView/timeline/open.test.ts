import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  openGraphViewNodeInEditor,
  previewGraphViewFileAtCommit,
} from '../../../../src/extension/graphView/timeline/open';

describe('graphView/timeline/open', () => {
  it('opens the file through timeline preview when a commit is active', async () => {
    const previewFileAtCommit = vi.fn(async () => undefined);
    const openFile = vi.fn(async () => undefined);

    await openGraphViewNodeInEditor(
      'src/app.ts',
      { timelineActive: true, currentCommitSha: 'abc123' },
      {
        previewFileAtCommit,
        openFile,
      },
      { preview: true, preserveFocus: true },
    );

    expect(previewFileAtCommit).toHaveBeenCalledWith(
      'abc123',
      'src/app.ts',
      { preview: true, preserveFocus: true },
    );
    expect(openFile).not.toHaveBeenCalled();
  });

  it('opens the workspace file when timeline mode is inactive', async () => {
    const previewFileAtCommit = vi.fn(async () => undefined);
    const openFile = vi.fn(async () => undefined);

    await openGraphViewNodeInEditor(
      'src/app.ts',
      { timelineActive: false },
      {
        previewFileAtCommit,
        openFile,
      },
      { preview: false, preserveFocus: false },
    );

    expect(previewFileAtCommit).not.toHaveBeenCalled();
    expect(openFile).toHaveBeenCalledWith('src/app.ts', {
      preview: false,
      preserveFocus: false,
    });
  });

  it('opens the workspace file when a commit sha exists but timeline mode is inactive', async () => {
    const previewFileAtCommit = vi.fn(async () => undefined);
    const openFile = vi.fn(async () => undefined);

    await openGraphViewNodeInEditor(
      'src/app.ts',
      { timelineActive: false, currentCommitSha: 'abc123' },
      {
        previewFileAtCommit,
        openFile,
      },
      { preview: false, preserveFocus: true },
    );

    expect(previewFileAtCommit).not.toHaveBeenCalled();
    expect(openFile).toHaveBeenCalledWith('src/app.ts', {
      preview: false,
      preserveFocus: true,
    });
  });

  it('opens the git-backed preview document for the requested commit', async () => {
    const gitUri = {
      fsPath: '/workspace/src/app.ts',
      toString: () =>
        'git:/workspace/src/app.ts?%7B%22path%22:%22/workspace/src/app.ts%22,%22ref%22:%22abc123%22%7D',
    } as vscode.Uri;
    const parse = vi.fn(() => gitUri);
    (vscode.Uri as unknown as Record<string, unknown>).parse = parse;
    const document = { uri: gitUri } as vscode.TextDocument;
    const openTextDocument = vi.fn(async () => document);
    const showTextDocument = vi.fn(async () => undefined);

    await previewGraphViewFileAtCommit(
      'abc123',
      'src/app.ts',
      {
        workspaceFolder: { uri: vscode.Uri.file('/workspace') },
        openTextDocument,
        showTextDocument,
        logError: vi.fn(),
      },
      { preview: true, preserveFocus: false },
    );

    expect(parse).toHaveBeenCalledWith(
      'git:/workspace/src/app.ts?{"path":"/workspace/src/app.ts","ref":"abc123"}',
    );
    expect(openTextDocument).toHaveBeenCalledWith(gitUri);
    expect(showTextDocument).toHaveBeenCalledWith(document, {
      preview: true,
      preserveFocus: false,
    });
  });

  it('uses the default preview behavior when no editor behavior override is provided', async () => {
    const document = { uri: vscode.Uri.file('/workspace/src/app.ts') } as vscode.TextDocument;
    const openTextDocument = vi.fn(async () => document);
    const showTextDocument = vi.fn(async () => undefined);

    await previewGraphViewFileAtCommit('abc123', 'src/app.ts', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      openTextDocument,
      showTextDocument,
      logError: vi.fn(),
    });

    expect(showTextDocument).toHaveBeenCalledWith(document, {
      preview: true,
      preserveFocus: false,
    });
  });

  it('returns early when there is no workspace folder for commit preview', async () => {
    const openTextDocument = vi.fn();
    const showTextDocument = vi.fn();

    await expect(
      previewGraphViewFileAtCommit('abc123', 'src/app.ts', {
        workspaceFolder: undefined,
        openTextDocument,
        showTextDocument,
        logError: vi.fn(),
      }),
    ).resolves.toBeUndefined();

    expect(openTextDocument).not.toHaveBeenCalled();
    expect(showTextDocument).not.toHaveBeenCalled();
  });

  it('logs preview failures without throwing', async () => {
    const logError = vi.fn();

    await expect(
      previewGraphViewFileAtCommit(
          'abc123',
          'src/app.ts',
          {
          workspaceFolder: { uri: vscode.Uri.file('/workspace') },
          openTextDocument: vi.fn(async () => {
            throw new Error('missing');
          }),
          showTextDocument: vi.fn(),
          logError,
        },
      ),
    ).resolves.toBeUndefined();

    expect(logError).toHaveBeenCalledWith(
      '[CodeGraphy] Failed to preview file at commit:',
      expect.any(Error),
    );
  });
});
