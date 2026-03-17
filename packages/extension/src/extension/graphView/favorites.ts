import type { ExtensionToWebviewMessage } from '../../shared/types';

interface GraphViewFavoritesConfig {
  get<T>(key: string, defaultValue: T): T;
}

export interface GraphViewFavoriteToggleHandlers {
  executeToggleFavoritesAction(paths: string[]): Promise<void>;
}

export async function toggleGraphViewFavorites(
  paths: string[],
  handlers: GraphViewFavoriteToggleHandlers,
): Promise<void> {
  await handlers.executeToggleFavoritesAction(paths);
}

export function sendGraphViewFavorites(
  config: GraphViewFavoritesConfig,
  sendMessage: (message: Extract<ExtensionToWebviewMessage, { type: 'FAVORITES_UPDATED' }>) => void,
): void {
  const favorites = config.get<string[]>('favorites', []);
  sendMessage({
    type: 'FAVORITES_UPDATED',
    payload: { favorites },
  });
}
