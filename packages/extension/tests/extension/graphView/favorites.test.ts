import { describe, expect, it, vi } from 'vitest';
import {
  sendGraphViewFavorites,
  toggleGraphViewFavorites,
} from '../../../src/extension/graphView/favorites';

describe('graphView/favorites', () => {
  it('delegates favorite toggles to the undoable action runner', async () => {
    const executeToggleFavoritesAction = vi.fn(async () => undefined);

    await toggleGraphViewFavorites(['src/app.ts'], {
      executeToggleFavoritesAction,
    });

    expect(executeToggleFavoritesAction).toHaveBeenCalledWith(['src/app.ts']);
  });

  it('sends the current favorites to the webview', () => {
    const sendMessage = vi.fn();
    const get = <T>(key: string, defaultValue: T): T => {
      if (key === 'favorites') {
        return ['src/app.ts'] as never as T;
      }

      return defaultValue;
    };

    sendGraphViewFavorites(
      {
        get,
      },
      sendMessage,
    );

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'FAVORITES_UPDATED',
      payload: { favorites: ['src/app.ts'] },
    });
  });

  it('sends an empty favorites payload when no favorites are configured', () => {
    const sendMessage = vi.fn();
    const get = vi.fn(<T>(_key: string, defaultValue: T): T => defaultValue);

    sendGraphViewFavorites(
      {
        get,
      },
      sendMessage,
    );

    expect(get).toHaveBeenCalledWith('favorites', []);
    expect(get.mock.calls[0]?.[1]).toEqual([]);
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'FAVORITES_UPDATED',
      payload: { favorites: [] },
    });
    expect(sendMessage.mock.calls[0]?.[0].payload.favorites).toEqual([]);
  });
});
