import { describe, expect, it, vi } from 'vitest';
import type { IGroup } from '../../../../../src/shared/settings/groups';
import {
  applyLegendMessage,
  type GraphViewLegendMessageHandlers,
  type GraphViewLegendMessageState,
} from '../../../../../src/extension/graphView/webview/messages/legends';

function createState(
  overrides: Partial<GraphViewLegendMessageState> = {},
): GraphViewLegendMessageState {
  return {
    userLegends: [],
    ...overrides,
  };
}

function createHandlers(
  overrides: Partial<GraphViewLegendMessageHandlers> = {},
): GraphViewLegendMessageHandlers {
  return {
    persistLegends: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('graph view legend message', () => {
  it('persists updated legends without transient webview fields', async () => {
    const incomingGroups: IGroup[] = [
      {
        id: 'user-group',
        pattern: 'src/**',
        color: '#112233',
        imagePath: '.codegraphy/assets/icon.png',
        imageUrl: 'webview://icon.png',
        isPluginDefault: true,
        pluginName: 'TypeScript',
      },
    ];
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applyLegendMessage(
        { type: 'UPDATE_LEGENDS', payload: { legends: incomingGroups } },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect(state.userLegends).toEqual([
      {
        id: 'user-group',
        pattern: 'src/**',
        color: '#112233',
        imagePath: '.codegraphy/assets/icon.png',
      },
    ]);
    expect(handlers.persistLegends).toHaveBeenCalledWith(state.userLegends);
  });

  it('returns false for unrelated messages', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applyLegendMessage(
        { type: 'UPDATE_SHOW_LABELS', payload: { showLabels: false } },
        state,
        handlers,
      ),
    ).resolves.toBe(false);
  });
});
