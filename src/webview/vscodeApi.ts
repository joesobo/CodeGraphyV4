import { WebviewToExtensionMessage } from '../shared/types';

declare function acquireVsCodeApi(): {
  postMessage: (message: WebviewToExtensionMessage) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

/** 
 * Singleton VSCode API instance.
 * acquireVsCodeApi() can only be called ONCE per webview, so we cache it here.
 * All components should use getVsCodeApi() or postMessage() from this module.
 */
let vscode: ReturnType<typeof acquireVsCodeApi> | null = null;

// Initialize immediately if available (do this at module load time)
if (typeof acquireVsCodeApi !== 'undefined') {
  try {
    vscode = acquireVsCodeApi();
  } catch {
    // Already acquired elsewhere - this shouldn't happen with proper usage
    vscode = null;
  }
}

export function getVsCodeApi(): ReturnType<typeof acquireVsCodeApi> | null {
  return vscode;
}

export function postMessage(message: WebviewToExtensionMessage): void {
  if (vscode) {
    vscode.postMessage(message);
  }
}
