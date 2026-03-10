/**
 * @fileoverview Centralized VSCode API access.
 * Ensures acquireVsCodeApi() is called exactly once (VSCode requirement).
 * @module webview/lib/vscodeApi
 */

import { WebviewToExtensionMessage } from '../../shared/types';

// Declare the VSCode API type
declare function acquireVsCodeApi(): {
  postMessage: (message: WebviewToExtensionMessage) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

// Type for the vscode API
export type VsCodeApi = ReturnType<typeof acquireVsCodeApi>;

// Acquire the API exactly once at module load (VSCode requirement)
let vscode: VsCodeApi | null = null;

try {
  if (typeof acquireVsCodeApi !== 'undefined') {
    vscode = acquireVsCodeApi();
  }
} catch {
  // Already acquired or not in VSCode context
  vscode = null;
}

/**
 * Get the VSCode API instance.
 * Returns null if not running in a VSCode webview context.
 */
export function getVsCodeApi(): VsCodeApi | null {
  return vscode;
}

/**
 * Post a message to the VSCode extension.
 * No-op if not running in a VSCode webview context.
 */
export function postMessage(message: WebviewToExtensionMessage): void {
  if (vscode) {
    vscode.postMessage(message);
  }
}
