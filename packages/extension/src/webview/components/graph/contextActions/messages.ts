import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { GraphContextEffect } from './effects';

type SinglePathMessageType = 'REVEAL_IN_EXPLORER' | 'RENAME_FILE';
type PathListMessageType = 'DELETE_FILES' | 'TOGGLE_FAVORITE';

function createPostMessageEffect(message: WebviewToExtensionMessage): GraphContextEffect {
  return { kind: 'postMessage', message };
}

export function createOptionalSinglePathMessageEffects(
  path: string | undefined,
  type: SinglePathMessageType,
): GraphContextEffect[] {
  return path ? [createPostMessageEffect({ type, payload: { path } })] : [];
}

export function createClipboardEffects(text: string): GraphContextEffect[] {
  return [createPostMessageEffect({ type: 'COPY_TO_CLIPBOARD', payload: { text } })];
}

export function createOptionalClipboardEffects(
  path: string | undefined,
  transform: (value: string) => string = (value) => value,
): GraphContextEffect[] {
  return path ? createClipboardEffects(transform(path)) : [];
}

export function createPathListMessageEffects(
  type: PathListMessageType,
  paths: string[],
): GraphContextEffect[] {
  return [createPostMessageEffect({ type, payload: { paths } })];
}

export function createPatternMessageEffects(patterns: string[]): GraphContextEffect[] {
  return [createPostMessageEffect({ type: 'ADD_TO_EXCLUDE', payload: { patterns } })];
}

export function createRefreshEffects(): GraphContextEffect[] {
  return [createPostMessageEffect({ type: 'REFRESH_GRAPH' })];
}

export function createCreateFileEffects(): GraphContextEffect[] {
  return [createPostMessageEffect({ type: 'CREATE_FILE', payload: { directory: '.' } })];
}
