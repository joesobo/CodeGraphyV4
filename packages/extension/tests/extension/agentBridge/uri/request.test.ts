import { describe, expect, it, vi } from 'vitest';
import {
  readAgentAction,
  readAgentRequest,
  warnUnsupportedAgentAction,
} from '../../../../src/extension/agentBridge/uri/request';
import type {
  CodeGraphyAgentRequest,
  CodeGraphyAgentUriDependencies,
  CodeGraphyAgentUriLike,
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

function createUri(query: string): CodeGraphyAgentUriLike {
  return { path: '/index', query };
}

describe('agentBridge/uri/request', () => {
  it('maps supported URI paths to agent actions', () => {
    expect(readAgentAction('/index')).toBe('index');
    expect(readAgentAction('/query')).toBe('query');
    expect(readAgentAction('/unknown')).toBeUndefined();
  });

  it('warns with the original unsupported path', () => {
    const dependencies = createDependencies({
      repo: '/workspace/project',
      responsePath: '/tmp/response.json',
    }, '/workspace/project');

    expect(warnUnsupportedAgentAction('/bad', dependencies)).toEqual({
      status: 'unsupported-action',
    });
    expect(dependencies.showWarningMessage).toHaveBeenCalledWith(
      'CodeGraphy ignored unsupported agent request: /bad.',
    );
  });

  it('uses a slash when warning about an empty unsupported path', () => {
    const dependencies = createDependencies({
      repo: '/workspace/project',
      responsePath: '/tmp/response.json',
    }, '/workspace/project');

    warnUnsupportedAgentAction('', dependencies);

    expect(dependencies.showWarningMessage).toHaveBeenCalledWith(
      'CodeGraphy ignored unsupported agent request: /.',
    );
  });

  it('reads the request file named in the URI query', async () => {
    const dependencies = createDependencies({
      repo: '/workspace/project',
      requestId: 'request-1',
      responsePath: '/tmp/response.json',
    });

    await expect(readAgentRequest(createUri('request=/tmp/request.json'), dependencies)).resolves.toEqual({
      repo: '/workspace/project',
      requestId: 'request-1',
      responsePath: '/tmp/response.json',
    });
    expect(dependencies.readRequestFile).toHaveBeenCalledWith('/tmp/request.json');
  });

  it('warns and skips reads when the URI has no request file', async () => {
    const dependencies = createDependencies({
      repo: '/workspace/project',
      responsePath: '/tmp/response.json',
    });

    await expect(readAgentRequest(createUri(''), dependencies)).resolves.toBeUndefined();

    expect(dependencies.readRequestFile).not.toHaveBeenCalled();
    expect(dependencies.showWarningMessage).toHaveBeenCalledWith(
      'CodeGraphy agent request did not include a request file.',
    );
  });

});
