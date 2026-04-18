import type { IFileInfo } from '../../../../../shared/files/info';
import type { ExtensionToWebviewMessage } from '../../../../../shared/protocol/extensionToWebview';
import type { GraphWebviewMessageEffect } from '../effects/routing';

type AccessCountPayload = Extract<ExtensionToWebviewMessage, { type: 'NODE_ACCESS_COUNT_UPDATED' }>['payload'];

export function getFileInfoEffects(
  tooltipPath: string | null,
  info: IFileInfo,
): GraphWebviewMessageEffect[] {
  const effects: GraphWebviewMessageEffect[] = [{ kind: 'cacheFileInfo', info }];
  if (tooltipPath === info.path) {
    effects.push({ kind: 'updateTooltipInfo', info });
  }
  return effects;
}

export function getAccessCountEffects(payload: AccessCountPayload): GraphWebviewMessageEffect[] {
  return [{
    kind: 'updateAccessCount',
    nodeId: payload.nodeId,
    accessCount: payload.accessCount,
  }];
}
