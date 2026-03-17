/**
 * @fileoverview Tests targeting the surviving mutant in configListener.ts.
 * Mutant: L17:11 ConditionalExpression replaced with true
 * (the `if (category !== null)` guard is bypassed).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('../../src/extension/configActions', () => ({
  executeConfigAction: vi.fn(),
}));

vi.mock('../../src/extension/configChangeDetection', () => ({
  classifyConfigChange: vi.fn(),
}));

import { registerConfigHandler } from '../../src/extension/configListener';
import { executeConfigAction } from '../../src/extension/configActions';
import { classifyConfigChange } from '../../src/extension/configChangeDetection';

function makeContext() {
  return {
    subscriptions: [] as { dispose: () => void }[],
  };
}

function getConfigListener() {
  const mock = vscode.workspace.onDidChangeConfiguration as unknown as {
    mock: { calls: unknown[][] };
  };
  return mock.mock.calls[0]?.[0] as (event: { affectsConfiguration: (key: string) => boolean }) => void;
}

describe('configListener null-category guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not call executeConfigAction when classifyConfigChange returns null', () => {
    vi.mocked(classifyConfigChange).mockReturnValue(null);

    const context = makeContext();
    registerConfigHandler(context as unknown as vscode.ExtensionContext, {} as never);

    const listener = getConfigListener();
    const event = { affectsConfiguration: () => false };
    listener(event);

    expect(classifyConfigChange).toHaveBeenCalledWith(event);
    expect(executeConfigAction).not.toHaveBeenCalled();
  });

  it('calls executeConfigAction when classifyConfigChange returns a category', () => {
    vi.mocked(classifyConfigChange).mockReturnValue('physics');

    const context = makeContext();
    const provider = {} as never;
    registerConfigHandler(context as unknown as vscode.ExtensionContext, provider);

    const listener = getConfigListener();
    const event = { affectsConfiguration: () => true };
    listener(event);

    expect(executeConfigAction).toHaveBeenCalledWith('physics', event, provider);
  });
});
