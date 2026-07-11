import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNativeDecorationsController } from '../../../src/extension/nativeDecorations/controller';
import type { NativeGitStatus } from '../../../src/extension/nativeDecorations/model';

describe('nativeDecorations/controller', () => {
  afterEach(() => vi.useRealTimers());

  it('debounces source changes into an in-place decoration update and replays the latest value', async () => {
    vi.useFakeTimers();
    let gitChanged: (() => void) | undefined;
    let diagnosticsChanged: (() => void) | undefined;
    const sendMessage = vi.fn();
    const controller = createNativeDecorationsController({
      collectGitStatuses: vi.fn(async () =>
        new Map<string, NativeGitStatus>([['/workspace/app.ts', 'modified']])),
      collectProblems: vi.fn(() => new Map([['/workspace/app.ts', { errors: 1, warnings: 0 }]])),
      onDidChangeGit: listener => {
        gitChanged = listener;
        return { dispose: vi.fn() };
      },
      onDidChangeDiagnostics: listener => {
        diagnosticsChanged = listener;
        return { dispose: vi.fn() };
      },
      sendMessage,
      debounceMs: 50,
    });

    await vi.runAllTimersAsync();
    sendMessage.mockClear();
    gitChanged?.();
    diagnosticsChanged?.();
    await vi.advanceTimersByTimeAsync(49);
    expect(sendMessage).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(sendMessage).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'NATIVE_DECORATIONS_UPDATED',
      payload: { nodeDecorations: expect.any(Object) },
    }));

    sendMessage.mockClear();
    controller.replay();
    expect(sendMessage).toHaveBeenCalledOnce();
  });
});
