import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/contracts';

const mocks = vi.hoisted(() => {
  let workspaceFolders: { uri: { fsPath: string } }[] | undefined = [{ uri: { fsPath: '/workspace' } }];

  return {
    get workspaceFolders(): { uri: { fsPath: string } }[] | undefined {
      return workspaceFolders;
    },
    set workspaceFolders(value: { uri: { fsPath: string } }[] | undefined) {
      workspaceFolders = value;
    },
    getConfiguration: vi.fn(),
    configurationGet: vi.fn(),
    showErrorMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    execFile: vi.fn(),
    promisify: vi.fn(),
    GitHistoryAnalyzer: vi.fn(),
    buildTimelineGraphData: vi.fn(),
    indexRepository: vi.fn(),
    sendCachedTimeline: vi.fn(),
  };
});

vi.mock('vscode', () => ({
  workspace: {
    get workspaceFolders() {
      return mocks.workspaceFolders;
    },
    set workspaceFolders(value: { uri: { fsPath: string } }[] | undefined) {
      mocks.workspaceFolders = value;
    },
    getConfiguration: mocks.getConfiguration,
  },
  window: {
    showErrorMessage: mocks.showErrorMessage,
    showInformationMessage: mocks.showInformationMessage,
  },
}));

vi.mock('child_process', () => ({
  execFile: mocks.execFile,
}));

vi.mock('util', () => ({
  promisify: mocks.promisify,
}));

vi.mock('../../../../src/extension/gitHistory/analyzer', () => ({
  GitHistoryAnalyzer: mocks.GitHistoryAnalyzer,
}));

vi.mock('../../../../src/extension/graphView/timeline/graph', () => ({
  buildGraphViewTimelineGraphData: mocks.buildTimelineGraphData,
}));

vi.mock('../../../../src/extension/graphView/timeline', () => ({
  indexGraphViewRepository: mocks.indexRepository,
}));

vi.mock('../../../../src/extension/graphView/timeline/playback', () => ({
  sendCachedGraphViewTimeline: mocks.sendCachedTimeline,
}));

import * as vscode from 'vscode';
import {
  indexGraphViewProviderRepository,
  jumpGraphViewProviderToCommit,
} from '../../../../src/extension/graphView/timeline/provider';

describe('graph view provider timeline default dependencies', () => {
  beforeEach(() => {
    mocks.workspaceFolders = [{ uri: { fsPath: '/workspace' } }];
    mocks.getConfiguration.mockReset();
    mocks.configurationGet.mockReset();
    mocks.showErrorMessage.mockReset();
    mocks.showInformationMessage.mockReset();
    mocks.execFile.mockReset();
    mocks.promisify.mockReset();
    mocks.GitHistoryAnalyzer.mockReset();
    mocks.buildTimelineGraphData.mockReset();
    mocks.indexRepository.mockReset();
    mocks.sendCachedTimeline.mockReset();

    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: mocks.configurationGet,
    } as never);
    mocks.configurationGet.mockImplementation((_key: string, fallback: unknown) => fallback);
    mocks.promisify.mockImplementation(
      (fn: (...args: unknown[]) => unknown) =>
        async (...args: unknown[]) => {
          await fn(...args);
          return { stdout: '', stderr: '' };
        },
    );
  });

  it('uses the default indexing delegates for workspace config git commands and messages', async () => {
    const nextGitAnalyzer = {
      getGraphDataForCommit: vi.fn(async () => ({ nodes: [], edges: [] } satisfies IGraphData)),
    };
    const source = {
      _context: { subscriptions: [] } as never,
      _analyzer: { registry: { kind: 'registry' } } as never,
      _analyzerInitialized: false,
      _gitAnalyzer: undefined,
      _indexingController: undefined,
      _filterPatterns: ['dist/**'],
      _timelineActive: false,
      _currentCommitSha: undefined,
      _disabledPlugins: new Set<string>(),
      _disabledRules: new Set<string>(),
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _sendMessage: vi.fn(),
    };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    mocks.configurationGet.mockImplementation((key: string, fallback: unknown) =>
      key === 'timeline.maxCommits' ? 321 : fallback,
    );
    mocks.GitHistoryAnalyzer.mockImplementation(() => nextGitAnalyzer);
    mocks.indexRepository.mockImplementation(async (_state, handlers) => {
      expect(handlers.workspaceFolder?.uri.fsPath).toBe('/workspace');
      expect(handlers.getMaxCommits()).toBe(321);
      await handlers.verifyGitRepository('/workspace');
      expect(mocks.promisify).toHaveBeenCalledWith(mocks.execFile);
      expect(mocks.execFile).toHaveBeenCalledWith('git', ['rev-parse', '--git-dir'], {
        cwd: '/workspace',
      });
      expect(handlers.createGitAnalyzer('/workspace', ['dist/**'])).toBe(nextGitAnalyzer);
      handlers.showErrorMessage('timeline failed');
      handlers.showInformationMessage('timeline indexed');
      handlers.logError('timeline error', 'raw failure');
    });

    await indexGraphViewProviderRepository(source as never);

    expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(mocks.configurationGet).toHaveBeenCalledWith('timeline.maxCommits', 500);
    expect(mocks.GitHistoryAnalyzer).toHaveBeenCalledWith(
      source._context,
      source._analyzer.registry,
      '/workspace',
      ['dist/**'],
    );
    expect(mocks.showErrorMessage).toHaveBeenCalledWith('timeline failed');
    expect(mocks.showInformationMessage).toHaveBeenCalledWith('timeline indexed');
    expect(consoleError).toHaveBeenCalledWith('timeline error', 'raw failure');

    consoleError.mockRestore();
  });

  it('uses the default jump dependencies when workspace and analyzer data are unavailable', async () => {
    const source = {
      _analyzer: undefined,
      _gitAnalyzer: {
        getGraphDataForCommit: vi.fn(async () => ({ nodes: ['raw'], edges: [] })),
      } as never,
      _currentCommitSha: undefined,
      _disabledPlugins: new Set<string>(['plugin.test']),
      _disabledRules: new Set<string>(['rule.test']),
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _sendMessage: vi.fn(),
    };
    const graphData = { nodes: [{ id: 'src/index.ts' }], edges: [] } satisfies IGraphData;

    mocks.workspaceFolders = undefined;
    mocks.buildTimelineGraphData.mockReturnValue(graphData);

    await jumpGraphViewProviderToCommit(source as never, 'sha-2');

    expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(mocks.configurationGet).toHaveBeenCalledWith('showOrphans', true);
    expect(mocks.buildTimelineGraphData).toHaveBeenCalledWith(
      { nodes: ['raw'], edges: [] },
      {
        disabledPlugins: new Set<string>(['plugin.test']),
        disabledRules: new Set<string>(['rule.test']),
        showOrphans: true,
        workspaceRoot: undefined,
        registry: undefined,
      },
    );
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'COMMIT_GRAPH_DATA',
      payload: { sha: 'sha-2', graphData },
    });
  });
});
