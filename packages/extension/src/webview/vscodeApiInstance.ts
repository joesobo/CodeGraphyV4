import type { WebviewToExtensionMessage } from '../shared/protocol/webviewToExtension';

declare function acquireVsCodeApi(): {
  postMessage: (message: WebviewToExtensionMessage) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

export type VsCodeApi = ReturnType<typeof acquireVsCodeApi>;

let vscode: VsCodeApi | null = null;
try {
  vscode = acquireVsCodeApi();
} catch {
  vscode = null;
}

export function getVsCodeApiInstance(): VsCodeApi | null {
  return vscode;
}
