import { WebviewToExtensionMessage } from '../shared/types';

declare function acquireVsCodeApi(): {
  postMessage: (message: WebviewToExtensionMessage) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

let vscode: ReturnType<typeof acquireVsCodeApi> | null = null;

export function getVsCodeApi(): ReturnType<typeof acquireVsCodeApi> | null {
  if (vscode) return vscode;
  if (typeof acquireVsCodeApi !== 'undefined') {
    try {
      vscode = acquireVsCodeApi();
    } catch {
      vscode = null;
    }
  }
  return vscode;
}

export function postMessage(message: WebviewToExtensionMessage): void {
  const api = getVsCodeApi();
  if (api) {
    api.postMessage(message);
  }
}
