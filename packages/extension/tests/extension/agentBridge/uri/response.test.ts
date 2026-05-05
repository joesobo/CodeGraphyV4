import { describe, expect, it, vi } from 'vitest';
import { writeFailureResponse } from '../../../../src/extension/agentBridge/uri/response';

describe('agentBridge/uri/response', () => {
  it('writes failed agent responses with the request identity', async () => {
    const writeResponseFile = vi.fn(async () => undefined);

    await writeFailureResponse(
      {
        repo: '/workspace/project',
        requestId: 'request-1',
        responsePath: '/tmp/response.json',
      },
      'failure text',
      {
        getWorkspaceRoot: () => '/workspace/project',
        readRequestFile: vi.fn(),
        showErrorMessage: vi.fn(),
        showWarningMessage: vi.fn(),
        writeResponseFile,
      },
    );

    expect(writeResponseFile).toHaveBeenCalledWith(
      '/tmp/response.json',
      {
        error: 'failure text',
        repo: '/workspace/project',
        requestId: 'request-1',
        status: 'failed',
      },
    );
  });
});
