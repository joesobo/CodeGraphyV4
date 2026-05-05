import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCodeGraphyAgentUriHandler } from '../../../../src/extension/agentBridge/uri/handler';

describe('agentBridge/uri/handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adapts VS Code URI handling to the agent URI flow', async () => {
    const handler = createCodeGraphyAgentUriHandler({
      refreshIndex: vi.fn(),
      queryGraph: vi.fn(),
    });

    await handler.handleUri({ path: '/unsupported', query: '' } as vscode.Uri);

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      'CodeGraphy ignored unsupported agent request: /unsupported.',
    );
  });
});
