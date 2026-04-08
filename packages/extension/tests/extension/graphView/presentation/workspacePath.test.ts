import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { getRelativeWorkspacePath } from '../../../../src/extension/graphView/presentation/workspacePath';

describe('graphView/presentation/workspacePath', () => {
  it('returns undefined when no workspace folder is open', () => {
    const asRelativePath = vi.fn();

    expect(
      getRelativeWorkspacePath(vscode.Uri.file('/workspace/src/app.ts'), undefined, asRelativePath),
    ).toBeUndefined();
    expect(asRelativePath).not.toHaveBeenCalled();
  });

  it('returns the relative path when VS Code resolves one', () => {
    const uri = vscode.Uri.file('/workspace/src/app.ts');
    const asRelativePath = vi.fn(() => 'src/app.ts');

    expect(
      getRelativeWorkspacePath(uri, [{ uri: vscode.Uri.file('/workspace') }], asRelativePath),
    ).toBe('src/app.ts');
    expect(asRelativePath).toHaveBeenCalledWith(uri, false);
  });

  it('returns undefined when VS Code resolves the filesystem path unchanged', () => {
    const uri = vscode.Uri.file('/workspace/src/app.ts');
    const asRelativePath = vi.fn(() => uri.fsPath);

    expect(
      getRelativeWorkspacePath(uri, [{ uri: vscode.Uri.file('/workspace') }], asRelativePath),
    ).toBeUndefined();
  });
});
