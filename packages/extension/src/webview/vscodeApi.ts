import type { WebviewToExtensionMessage } from '../shared/protocol/webviewToExtension';
import { getVsCodeApiInstance, type VsCodeApi } from './vscodeApiInstance';

export type { VsCodeApi };

/**
 * Get the VSCode API instance.
 * Returns null if not running in a VSCode webview context.
 */
export function getVsCodeApi(): VsCodeApi | null {
  return getVsCodeApiInstance();
}

/**
 * Post a message to the VSCode extension.
 * No-op if not running in a VSCode webview context.
 */
export function postMessage(message: WebviewToExtensionMessage): void {
  const vscode = getVsCodeApiInstance();
  if (vscode) {
    vscode.postMessage(message);
  }
}
