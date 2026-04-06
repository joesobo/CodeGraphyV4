import * as vscode from 'vscode';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';

export async function applySurfaceMessage(
  message: WebviewToExtensionMessage,
): Promise<boolean> {
  if (message.type !== 'GRAPH_3D_UNAVAILABLE') {
    return false;
  }

  const detail = message.payload.message.trim();
  const suffix = detail.length > 0 ? ` Details: ${detail}` : '';
  vscode.window.showWarningMessage(
    `3D mode is unavailable in this environment. CodeGraphy stayed in 2D mode.${suffix}`,
  );
  return true;
}
