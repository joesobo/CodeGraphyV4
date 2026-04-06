import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applySurfaceMessage } from '../../../../../src/extension/graphView/webview/messages/surface';

describe('graph view webview surface messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.window as Record<string, unknown>).showWarningMessage = vi.fn();
  });

  it('shows a warning when the webview reports that 3d mode is unavailable', async () => {
    await expect(applySurfaceMessage({
      type: 'GRAPH_3D_UNAVAILABLE',
      payload: { message: 'Error creating WebGL context.' },
    })).resolves.toBe(true);

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      '3D mode is unavailable in this environment. CodeGraphy stayed in 2D mode. Details: Error creating WebGL context.',
    );
  });

  it('ignores unrelated messages', async () => {
    await expect(applySurfaceMessage({ type: 'REFRESH_GRAPH' })).resolves.toBe(false);
    expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
  });
});
