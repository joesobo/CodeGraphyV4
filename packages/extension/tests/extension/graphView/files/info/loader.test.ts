import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { loadGraphViewFileInfo } from '../../../../../src/extension/graphView/files/info/loader';

describe('graphView/files/info/loader', () => {
  it('returns no payload when no workspace folder is available', async () => {
    const statFile = vi.fn();
    const ensureAnalyzerReady = vi.fn();

    const payload = await loadGraphViewFileInfo('src/main.py', {
      workspaceFolder: undefined,
      statFile,
      ensureAnalyzerReady,
      graphData: { nodes: [], edges: [] },
    });

    expect(payload).toBeUndefined();
    expect(statFile).not.toHaveBeenCalled();
    expect(ensureAnalyzerReady).not.toHaveBeenCalled();
  });

  it('omits plugin names when plugins support the file but did not contribute graph facts', async () => {
    const statFile = vi.fn().mockResolvedValue({ size: 456, mtime: 123 });
    const analyzer = {
      getPluginNameForFile: vi.fn(() => 'Markdown'),
      getPluginNamesForIds: vi.fn(() => ['Markdown']),
    };
    const ensureAnalyzerReady = vi.fn().mockResolvedValue(analyzer);

    const payload = await loadGraphViewFileInfo('src/main.py', {
      workspaceFolder: { uri: vscode.Uri.file('/test/workspace') },
      statFile,
      ensureAnalyzerReady,
      graphData: {
        nodes: [],
        edges: [
          { id: 'a', from: 'src/main.py', to: 'src/config.py' , kind: 'import', sources: [] },
          { id: 'b', from: 'src/input.py', to: 'src/main.py' , kind: 'import', sources: [] },
          { id: 'c', from: 'src/main.py', to: 'src/other.py' , kind: 'import', sources: [] },
        ],
      },
    });

    expect(statFile).toHaveBeenCalledWith(vscode.Uri.file('/test/workspace/src/main.py'));
    expect(ensureAnalyzerReady).not.toHaveBeenCalled();
    expect(analyzer.getPluginNameForFile).not.toHaveBeenCalled();
    expect(analyzer.getPluginNamesForIds).not.toHaveBeenCalled();
    expect(payload).toEqual({
      path: 'src/main.py',
      size: 456,
      lastModified: 123,
      incomingCount: 1,
      outgoingCount: 2,
      plugin: undefined,
    });
  });

  it('reports distinct plugin names from plugin-sourced edges touching the file', async () => {
    const analyzer = {
      getPluginNamesForIds: vi.fn((pluginIds: readonly string[]) =>
        pluginIds.map(pluginId => ({
          'codegraphy.markdown': 'Markdown',
          'codegraphy.vue': 'Vue',
        }[pluginId] ?? pluginId)),
      ),
    };

    const payload = await loadGraphViewFileInfo('README.md', {
      workspaceFolder: { uri: vscode.Uri.file('/test/workspace') },
      statFile: vi.fn().mockResolvedValue({ size: 456, mtime: 123 }),
      ensureAnalyzerReady: vi.fn().mockResolvedValue(analyzer),
      graphData: {
        nodes: [],
        edges: [
          {
            id: 'a',
            from: 'README.md',
            to: 'docs/guide.md',
            kind: 'reference',
            sources: [
              { id: 'codegraphy.markdown:wikilink', pluginId: 'codegraphy.markdown', sourceId: 'wikilink', label: 'Wikilink' },
            ],
          },
          {
            id: 'b',
            from: 'src/App.vue',
            to: 'README.md',
            kind: 'reference',
            sources: [
              { id: 'codegraphy.vue:doc-reference', pluginId: 'codegraphy.vue', sourceId: 'doc-reference', label: 'Doc reference' },
              { id: 'codegraphy.markdown:wikilink', pluginId: 'codegraphy.markdown', sourceId: 'wikilink', label: 'Wikilink' },
            ],
          },
        ],
      },
    });

    expect(analyzer.getPluginNamesForIds).toHaveBeenCalledWith(['codegraphy.markdown', 'codegraphy.vue']);
    expect(payload?.plugin).toBe('Markdown, Vue');
  });

  it('builds file info payloads without a plugin when the analyzer is unavailable', async () => {
    const payload = await loadGraphViewFileInfo('src/main.py', {
      workspaceFolder: { uri: vscode.Uri.file('/test/workspace') },
      statFile: vi.fn().mockResolvedValue({ size: 456, mtime: 123 }),
      ensureAnalyzerReady: vi.fn().mockResolvedValue(undefined),
      graphData: { nodes: [], edges: [] },
    });

    expect(payload).toEqual({
      path: 'src/main.py',
      size: 456,
      lastModified: 123,
      incomingCount: 0,
      outgoingCount: 0,
      plugin: undefined,
    });
  });
});
