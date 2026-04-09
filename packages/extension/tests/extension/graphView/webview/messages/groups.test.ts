import { describe, expect, it, vi } from 'vitest';
import type { IGroup } from '../../../../../src/shared/settings/groups';
import {
  applyGroupMessage,
  type GraphViewGroupMessageHandlers,
  type GraphViewGroupMessageState,
} from '../../../../../src/extension/graphView/webview/messages/groups';

function createState(
  overrides: Partial<GraphViewGroupMessageState> = {},
): GraphViewGroupMessageState {
  return {
    userGroups: [],
    ...overrides,
  };
}

function createHandlers(
  overrides: Partial<GraphViewGroupMessageHandlers> = {},
): GraphViewGroupMessageHandlers {
  return {
    persistGroups: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('graph view group message', () => {
  it('persists updated groups without transient webview fields', async () => {
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
      applyGroupMessage(
        { type: 'UPDATE_LEGENDS', payload: { legends: incomingGroups } },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect(state.userGroups).toEqual([
      {
        id: 'user-group',
        pattern: 'src/**',
        color: '#112233',
        imagePath: '.codegraphy/assets/icon.png',
      },
    ]);
    expect(handlers.persistGroups).toHaveBeenCalledWith(state.userGroups);
  });

  it('returns false for unrelated messages', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applyGroupMessage(
        { type: 'UPDATE_SHOW_LABELS', payload: { showLabels: false } },
        state,
        handlers,
      ),
    ).resolves.toBe(false);
  });
});
