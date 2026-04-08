import type * as vscode from 'vscode';

export interface ExtensionMessageEmitter {
  event(handler: (message: unknown) => void): vscode.Disposable;
  fire(message: unknown): void;
  dispose(): void;
}

export function createExtensionMessageEmitter(): ExtensionMessageEmitter {
  const handlers: globalThis.Set<(message: unknown) => void> = new globalThis.Set();

  return {
    event(handler) {
      handlers.add(handler);
      return {
        dispose: () => {
          handlers.delete(handler);
        },
      };
    },
    fire(message) {
      for (const handler of handlers) {
        handler(message);
      }
    },
    dispose() {
      handlers.clear();
    },
  };
}
