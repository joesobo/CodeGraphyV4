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
    persistDefaultLegendVisibility: vi.fn(() => Promise.resolve()),
    persistLegendOrder: vi.fn(() => Promise.resolve()),
    recomputeGroups: vi.fn(),
    sendGroupsUpdated: vi.fn(),
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

  it('persists plugin-default visibility overrides and resends groups', async () => {
    const state = createState({
      userLegends: [{ id: 'user-group', pattern: 'src/**', color: '#112233' }],
    });
    const handlers = createHandlers();

    await expect(
      applyLegendMessage(
        {
          type: 'UPDATE_DEFAULT_LEGEND_VISIBILITY',
          payload: { legendId: 'plugin:codegraphy.typescript:*.ts', visible: false },
        },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.persistDefaultLegendVisibility).toHaveBeenCalledWith(
      'plugin:codegraphy.typescript:*.ts',
      false,
    );
    expect(handlers.recomputeGroups).toHaveBeenCalledOnce();
    expect(handlers.sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(state.userLegends).toEqual([{ id: 'user-group', pattern: 'src/**', color: '#112233' }]);
  });

  it('persists legend ordering and resends groups', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applyLegendMessage(
        {
          type: 'UPDATE_LEGEND_ORDER',
          payload: { legendIds: ['plugin:codegraphy.typescript:*.ts', 'legend:user'] },
        },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.persistLegendOrder).toHaveBeenCalledWith([
      'plugin:codegraphy.typescript:*.ts',
      'legend:user',
    ]);
    expect(handlers.recomputeGroups).toHaveBeenCalledOnce();
    expect(handlers.sendGroupsUpdated).toHaveBeenCalledOnce();
  });
});
