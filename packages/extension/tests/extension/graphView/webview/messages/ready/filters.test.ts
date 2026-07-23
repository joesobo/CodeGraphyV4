import { describe, expect, it, vi } from 'vitest';
import { applyWebviewReady } from '../../../../../../src/extension/graphView/webview/messages/ready';
import { createHandlers } from './fixture';

describe('graph view ready filter replay', () => {
  it('replays filter patterns after graph loading so the active webview receives them', async () => {
    const events: string[] = [];
    const handlers = createHandlers();
    handlers.sendMessage.mockImplementation((message: { type: string }) => {
      if (message.type === 'FILTER_PATTERNS_UPDATED') {
        events.push('filters');
      }
    });
    handlers.loadAndSendData.mockImplementation(() => {
      events.push('graph');
    });

    await applyWebviewReady(
      {
        maxFiles: 500,
        verboseDiagnostics: false,
        nodeSizeMode: 'connections',
        focusedFile: undefined,
        hasWorkspace: true,
        firstAnalysis: true,
        readyNotified: false,
      },
      handlers
    );

    expect(events).toEqual(['filters', 'graph', 'filters']);
    expect(handlers.sendMessage.mock.calls.filter(([message]) =>
      (message as { type?: string }).type === 'FILTER_PATTERNS_UPDATED'
    )).toHaveLength(2);
  });

  it('replays unchanged plugin filter groups after graph loading', async () => {
    const handlers = createHandlers();
    handlers.getPluginFilterPatterns.mockReturnValue(['**/*.meta']);
    handlers.getPluginFilterGroups = vi.fn(() => [
      { pluginId: 'codegraphy.unity', pluginName: 'Unity', patterns: ['**/*.meta'] },
    ]);

    await applyWebviewReady(
      {
        maxFiles: 500,
        verboseDiagnostics: false,
        nodeSizeMode: 'connections',
        focusedFile: undefined,
        hasWorkspace: true,
        firstAnalysis: true,
        readyNotified: false,
      },
      handlers
    );

    expect(handlers.sendMessage.mock.calls.filter(([message]) =>
      (message as { type?: string }).type === 'FILTER_PATTERNS_UPDATED'
    )).toHaveLength(2);
  });

  it('replays plugin filters that become available while loading graph data', async () => {
    const handlers = createHandlers();
    let pluginPatterns: string[] = [];
    let pluginPatternGroups: Array<{ pluginId: string; pluginName: string; patterns: string[] }> = [];
    handlers.getPluginFilterPatterns.mockImplementation(() => pluginPatterns);
    handlers.getPluginFilterGroups = vi.fn(() => pluginPatternGroups);
    handlers.loadAndSendData.mockImplementation(() => {
      pluginPatterns = ['**/*.meta'];
      pluginPatternGroups = [
        { pluginId: 'codegraphy.unity', pluginName: 'Unity', patterns: ['**/*.meta'] },
      ];
    });

    await applyWebviewReady(
      {
        maxFiles: 500,
        verboseDiagnostics: false,
        nodeSizeMode: 'connections',
        focusedFile: undefined,
        hasWorkspace: true,
        firstAnalysis: true,
        readyNotified: false,
      },
      handlers
    );

    expect(handlers.sendMessage).toHaveBeenLastCalledWith({
      type: 'APP_BOOTSTRAP_COMPLETE',
    });
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'FILTER_PATTERNS_UPDATED',
      payload: {
        patterns: ['dist/**'],
        pluginPatterns: ['**/*.meta'],
        pluginPatternGroups: [
          { pluginId: 'codegraphy.unity', pluginName: 'Unity', patterns: ['**/*.meta'] },
        ],
        disabledCustomPatterns: [],
        disabledPluginPatterns: [],
      },
    });
  });
});
