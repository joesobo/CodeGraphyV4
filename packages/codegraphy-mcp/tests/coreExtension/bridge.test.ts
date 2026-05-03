import { describe, expect, it } from 'vitest';
import { sendCoreExtensionRequest } from '../../src/coreExtension/bridge';

describe('coreExtension/bridge', () => {
  it('writes a request file, opens the Core Extension URI, and returns the response', async () => {
    const commands: Array<{ command: string; args: string[] }> = [];
    const writes = new Map<string, string>();

    const result = await sendCoreExtensionRequest(
      {
        action: 'query',
        repo: '/workspace/project',
        query: { report: 'nodes', arguments: { search: 'GraphQuery' } },
      },
      {
        createRequestId: () => 'request-1',
        createTempDir: async () => '/tmp/codegraphy-request-1',
        platform: 'darwin',
        runCommand: (command, args) => {
          commands.push({ command, args });
          return { status: 0 };
        },
        waitForResponseFile: async () => JSON.stringify({
          requestId: 'request-1',
          repo: '/workspace/project',
          status: 'ok',
          result: { nodes: [], page: { offset: 0, limit: 500, returned: 0, total: 0 } },
        }),
        writeFile: async (filePath, contents) => {
          writes.set(filePath, contents);
        },
      },
    );

    expect(commands).toEqual([
      {
        command: 'open',
        args: ['vscode://codegraphy.codegraphy/query?request=%2Ftmp%2Fcodegraphy-request-1%2Frequest.json'],
      },
    ]);
    expect(JSON.parse(writes.get('/tmp/codegraphy-request-1/request.json') ?? '')).toEqual({
      repo: '/workspace/project',
      requestId: 'request-1',
      responsePath: '/tmp/codegraphy-request-1/response.json',
      query: { report: 'nodes', arguments: { search: 'GraphQuery' } },
    });
    expect(result).toEqual({
      requestId: 'request-1',
      repo: '/workspace/project',
      status: 'ok',
      result: { nodes: [], page: { offset: 0, limit: 500, returned: 0, total: 0 } },
    });
  });

  it('returns a failed response when the Core Extension URI cannot be opened', async () => {
    const result = await sendCoreExtensionRequest(
      {
        action: 'index',
        repo: '/workspace/project',
      },
      {
        createRequestId: () => 'request-2',
        createTempDir: async () => '/tmp/codegraphy-request-2',
        platform: 'darwin',
        runCommand: () => ({ status: 1, stderr: 'open failed' }),
        waitForResponseFile: async () => '{}',
        writeFile: async () => undefined,
      },
    );

    expect(result).toEqual({
      requestId: 'request-2',
      repo: '/workspace/project',
      status: 'failed',
      error: '`open vscode://codegraphy.codegraphy/index?request=%2Ftmp%2Fcodegraphy-request-2%2Frequest.json` failed: open failed',
    });
  });

  it('returns a failed response when the Core Extension response cannot be read', async () => {
    const result = await sendCoreExtensionRequest(
      {
        action: 'index',
        repo: '/workspace/project',
      },
      {
        createRequestId: () => 'request-3',
        createTempDir: async () => '/tmp/codegraphy-request-3',
        platform: 'darwin',
        runCommand: () => ({ status: 0 }),
        waitForResponseFile: async () => {
          throw new Error('Timed out waiting for response');
        },
        writeFile: async () => undefined,
      },
    );

    expect(result).toEqual({
      requestId: 'request-3',
      repo: '/workspace/project',
      status: 'failed',
      error: 'CodeGraphy Core Extension did not write a response: Timed out waiting for response',
    });
  });

  it('waits for the Core Extension response file to contain complete JSON', async () => {
    const responses = [
      '',
      '{',
      JSON.stringify({
        requestId: 'request-4',
        repo: '/workspace/project',
        status: 'indexed',
      }),
    ];

    const result = await sendCoreExtensionRequest(
      {
        action: 'index',
        repo: '/workspace/project',
      },
      {
        createRequestId: () => 'request-4',
        createTempDir: async () => '/tmp/codegraphy-request-4',
        platform: 'darwin',
        runCommand: () => ({ status: 0 }),
        waitForResponseFile: async () => responses.shift() ?? '',
        writeFile: async () => undefined,
      },
    );

    expect(result).toEqual({
      requestId: 'request-4',
      repo: '/workspace/project',
      status: 'indexed',
    });
  });
});
