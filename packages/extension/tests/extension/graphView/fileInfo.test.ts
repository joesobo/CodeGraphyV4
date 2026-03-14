import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { loadGraphViewFileInfo } from '../../../src/extension/graphView/fileInfo';

describe('graphView/fileInfo', () => {
  it('returns no payload when no workspace folder is available', async () => {
    const payload = await loadGraphViewFileInfo('src/main.py', {
      workspaceFolder: undefined,
      statFile: vi.fn(),
      ensureAnalyzerReady: vi.fn(),
      graphData: { nodes: [], edges: [] },
      getVisitCount: vi.fn(),
    });

    expect(payload).toBeUndefined();
  });

  it('builds file info payloads from stat, analyzer, graph, and visit state', async () => {
    const statFile = vi.fn().mockResolvedValue({ size: 456, mtime: 123 });
    const analyzer = {
      getPluginNameForFile: vi.fn(() => 'Python'),
    };
    const ensureAnalyzerReady = vi.fn().mockResolvedValue(analyzer);
    const getVisitCount = vi.fn(() => 4);

    const payload = await loadGraphViewFileInfo('src/main.py', {
      workspaceFolder: { uri: vscode.Uri.file('/test/workspace') },
      statFile,
      ensureAnalyzerReady,
      graphData: {
        nodes: [],
        edges: [
          { id: 'a', from: 'src/main.py', to: 'src/config.py' },
          { id: 'b', from: 'src/input.py', to: 'src/main.py' },
          { id: 'c', from: 'src/main.py', to: 'src/other.py' },
        ],
      },
      getVisitCount,
    });

    expect(statFile).toHaveBeenCalledWith(vscode.Uri.file('/test/workspace/src/main.py'));
    expect(ensureAnalyzerReady).toHaveBeenCalledTimes(1);
    expect(analyzer.getPluginNameForFile).toHaveBeenCalledWith('src/main.py');
    expect(getVisitCount).toHaveBeenCalledWith('src/main.py');
    expect(payload).toEqual({
      path: 'src/main.py',
      size: 456,
      lastModified: 123,
      incomingCount: 1,
      outgoingCount: 2,
      plugin: 'Python',
      visits: 4,
    });
  });
});
