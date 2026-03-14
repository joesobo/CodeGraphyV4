import type { IFileInfo, WebviewToExtensionMessage } from '../../../../shared/types';
import type { GraphWebviewMessageEffect } from '../../graphWebviewMessageEffects';

export interface GraphWebviewMessageEffectHandlers {
  fitView(): void;
  zoom2d(factor: number): void;
  cacheFileInfo(info: IFileInfo): void;
  updateTooltipInfo(info: IFileInfo): void;
  postMessage(message: WebviewToExtensionMessage): void;
  exportPng(): void;
  exportSvg(): void;
  exportJpeg(): void;
  exportJson(): void;
  exportMarkdown(): void;
  updateAccessCount(nodeId: string, accessCount: number): void;
}

export function applyWebviewMessageEffects(
  effects: GraphWebviewMessageEffect[],
  handlers: GraphWebviewMessageEffectHandlers
): void {
  for (const effect of effects) {
    switch (effect.kind) {
      case 'fitView':
        handlers.fitView();
        break;
      case 'zoom':
        handlers.zoom2d(effect.factor);
        break;
      case 'cacheFileInfo':
        handlers.cacheFileInfo(effect.info);
        break;
      case 'updateTooltipInfo':
        handlers.updateTooltipInfo(effect.info);
        break;
      case 'postMessage':
        handlers.postMessage(effect.message);
        break;
      case 'exportPng':
        handlers.exportPng();
        break;
      case 'exportSvg':
        handlers.exportSvg();
        break;
      case 'exportJpeg':
        handlers.exportJpeg();
        break;
      case 'exportJson':
        handlers.exportJson();
        break;
      case 'exportMarkdown':
        handlers.exportMarkdown();
        break;
      case 'updateAccessCount':
        handlers.updateAccessCount(effect.nodeId, effect.accessCount);
        break;
    }
  }
}
