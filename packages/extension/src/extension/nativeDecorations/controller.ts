import type * as vscode from 'vscode';
import type { ExtensionToWebviewMessage } from '../../shared/protocol/extensionToWebview';
import { buildNativeNodeDecorations, type NativeGitStatus, type NativeProblemCounts } from './model';

type NativeDecorationsMessage = Extract<
  ExtensionToWebviewMessage,
  { type: 'NATIVE_DECORATIONS_UPDATED' }
>;

export interface NativeDecorationsControllerDependencies {
  collectGitStatuses(): Promise<ReadonlyMap<string, NativeGitStatus>>;
  collectProblems(): ReadonlyMap<string, NativeProblemCounts> | Promise<ReadonlyMap<string, NativeProblemCounts>>;
  onDidChangeGit(listener: () => void): vscode.Disposable;
  onDidChangeDiagnostics(listener: () => void): vscode.Disposable;
  sendMessage(message: NativeDecorationsMessage): void;
  debounceMs?: number;
}

export interface NativeDecorationsController extends vscode.Disposable {
  replay(): void;
}

export function createNativeDecorationsController(
  dependencies: NativeDecorationsControllerDependencies,
): NativeDecorationsController {
  let latestMessage: NativeDecorationsMessage = {
    type: 'NATIVE_DECORATIONS_UPDATED',
    payload: { nodeDecorations: {} },
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  let disposed = false;

  const publish = async (): Promise<void> => {
    const publishGeneration = ++generation;
    const [gitStatuses, problems] = await Promise.all([
      dependencies.collectGitStatuses(),
      dependencies.collectProblems(),
    ]);
    if (disposed || publishGeneration !== generation) return;
    latestMessage = {
      type: 'NATIVE_DECORATIONS_UPDATED',
      payload: { nodeDecorations: buildNativeNodeDecorations(gitStatuses, problems) },
    };
    dependencies.sendMessage(latestMessage);
  };

  const schedule = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      void publish();
    }, dependencies.debounceMs ?? 100);
  };

  const subscriptions = [
    dependencies.onDidChangeGit(schedule),
    dependencies.onDidChangeDiagnostics(schedule),
  ];
  schedule();

  return {
    replay: () => dependencies.sendMessage(latestMessage),
    dispose: () => {
      disposed = true;
      generation += 1;
      if (timer) clearTimeout(timer);
      for (const subscription of subscriptions) subscription.dispose();
    },
  };
}
