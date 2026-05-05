import { describe, expect, it, vi } from 'vitest';
import { guardWorkspaceRequest } from '../../../../src/extension/agentBridge/uri/workspace';
import type {
  CodeGraphyAgentRequest,
  CodeGraphyAgentUriDependencies,
} from '../../../../src/extension/agentBridge/uri/types';

function createDependencies(
  request: CodeGraphyAgentRequest,
  workspaceRoot?: string,
): CodeGraphyAgentUriDependencies {
  return {
    getWorkspaceRoot: () => workspaceRoot,
    readRequestFile: vi.fn(async () => request),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    writeResponseFile: vi.fn(async () => undefined),
  };
}

describe('agentBridge/uri/workspace', () => {
  it('accepts requests for the active workspace', async () => {
    const dependencies = createDependencies({
      repo: '/workspace/project',
      responsePath: '/tmp/response.json',
    }, '/workspace/project');

    await expect(guardWorkspaceRequest({
      repo: '/workspace/project',
      responsePath: '/tmp/response.json',
    }, dependencies)).resolves.toBeUndefined();
    expect(dependencies.writeResponseFile).not.toHaveBeenCalled();
  });

  it('writes an exact failure response when no workspace is open', async () => {
    const request = {
      repo: '/workspace/project',
      requestId: 'request-2',
      responsePath: '/tmp/response.json',
    };
    const dependencies = createDependencies(request, undefined);

    await expect(guardWorkspaceRequest(request, dependencies)).resolves.toEqual({
      status: 'missing-workspace',
    });

    expect(dependencies.writeResponseFile).toHaveBeenCalledWith(
      '/tmp/response.json',
      {
        error: 'CodeGraphy agent request for /workspace/project needs a VS Code window opened on that repo.',
        repo: '/workspace/project',
        requestId: 'request-2',
        status: 'failed',
      },
    );
  });

  it('writes and warns with exact workspace mismatch details', async () => {
    const request = {
      repo: '/workspace/project',
      requestId: 'request-3',
      responsePath: '/tmp/response.json',
    };
    const dependencies = createDependencies(request, '/workspace/other');
    const message = 'CodeGraphy agent request targeted /workspace/project, but this VS Code window is indexing /workspace/other. Open the target repo window and retry.';

    await expect(guardWorkspaceRequest(request, dependencies)).resolves.toEqual({
      status: 'wrong-workspace',
    });

    expect(dependencies.writeResponseFile).toHaveBeenCalledWith(
      '/tmp/response.json',
      {
        error: message,
        repo: '/workspace/project',
        requestId: 'request-3',
        status: 'failed',
      },
    );
    expect(dependencies.showWarningMessage).toHaveBeenCalledWith(message);
  });
});
