import type { IFileInfo } from '../../../../../shared/files/info';
import type { GraphWebviewMessageEffect } from '../effects/routing';

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
