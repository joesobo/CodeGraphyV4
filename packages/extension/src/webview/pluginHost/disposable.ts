export interface WebviewDisposable {
  dispose(): void;
}

export function toWebviewDisposable(dispose: () => void): WebviewDisposable {
  return { dispose };
}
