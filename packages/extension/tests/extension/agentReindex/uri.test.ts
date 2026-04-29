import * as path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleCodeGraphyAgentUri } from '../../../src/extension/agentReindex/uri';

function createDependencies(workspaceRoot?: string) {
  return {
    getWorkspaceRoot: () => workspaceRoot,
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
  };
}

function createUri(action: string, repo?: string) {
  return {
    path: action,
    query: repo ? `repo=${encodeURIComponent(repo)}&requestId=test-request` : '',
  };
}

describe('agentReindex/uri', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes the index when the request targets the active workspace', async () => {
    const workspaceRoot = path.resolve('/workspace/project');
    const refreshIndex = vi.fn(async () => {});
    const dependencies = createDependencies(workspaceRoot);

    const result = await handleCodeGraphyAgentUri(
      createUri('/reindex', workspaceRoot),
      { refreshIndex },
      dependencies,
    );

    expect(result.status).toBe('reindexed');
    expect(refreshIndex).toHaveBeenCalledTimes(1);
    expect(dependencies.showWarningMessage).not.toHaveBeenCalled();
  });

  it('does not refresh when the receiving VS Code window is for another repo', async () => {
    const refreshIndex = vi.fn(async () => {});
    const dependencies = createDependencies(path.resolve('/workspace/other'));

    const result = await handleCodeGraphyAgentUri(
      createUri('/reindex', path.resolve('/workspace/project')),
      { refreshIndex },
      dependencies,
    );

    expect(result.status).toBe('wrong-workspace');
    expect(refreshIndex).not.toHaveBeenCalled();
    expect(dependencies.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('targeted'),
    );
  });

  it('does not refresh when the URI does not include a repo path', async () => {
    const refreshIndex = vi.fn(async () => {});
    const dependencies = createDependencies(path.resolve('/workspace/project'));

    const result = await handleCodeGraphyAgentUri(
      createUri('/reindex'),
      { refreshIndex },
      dependencies,
    );

    expect(result.status).toBe('missing-repo');
    expect(refreshIndex).not.toHaveBeenCalled();
    expect(dependencies.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('did not include a repo path'),
    );
  });

  it('ignores unsupported actions', async () => {
    const refreshIndex = vi.fn(async () => {});
    const dependencies = createDependencies(path.resolve('/workspace/project'));

    const result = await handleCodeGraphyAgentUri(
      createUri('/unknown', path.resolve('/workspace/project')),
      { refreshIndex },
      dependencies,
    );

    expect(result.status).toBe('unsupported-action');
    expect(refreshIndex).not.toHaveBeenCalled();
    expect(dependencies.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('unsupported'),
    );
  });

  it('shows an error when the extension refresh fails', async () => {
    const workspaceRoot = path.resolve('/workspace/project');
    const refreshIndex = vi.fn(async () => {
      throw new Error('index failed');
    });
    const dependencies = createDependencies(workspaceRoot);

    const result = await handleCodeGraphyAgentUri(
      createUri('/reindex', workspaceRoot),
      { refreshIndex },
      dependencies,
    );

    expect(result.status).toBe('failed');
    expect(dependencies.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('index failed'),
    );
  });
});
