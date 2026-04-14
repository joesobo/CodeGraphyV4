import type { IFileInfo } from '../../../../shared/files/info';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { GraphWebviewMessageEffect } from '../messages/effects';

export interface GraphWebviewMessageEffectHandlers {
  fitView(): void;
  zoom2d(factor: number): void;
  cacheFileInfo(info: IFileInfo): void;
  updateTooltipInfo(info: IFileInfo): void;
  postMessage(message: WebviewToExtensionMessage): void;
  openInEditor(): void;
  exportPng(): void;
  exportSvg(): void;
  exportJpeg(): void;
  exportJson(): void;
  exportMarkdown(): void;
  updateAccessCount(nodeId: string, accessCount: number): void;
}

type WebviewMessageEffectHandler = (
  effect: GraphWebviewMessageEffect,
  handlers: GraphWebviewMessageEffectHandlers,
) => void;

type ZoomEffect = Extract<GraphWebviewMessageEffect, { kind: 'zoom' }>;
type CacheFileInfoEffect = Extract<GraphWebviewMessageEffect, { kind: 'cacheFileInfo' }>;
type UpdateTooltipInfoEffect = Extract<GraphWebviewMessageEffect, { kind: 'updateTooltipInfo' }>;
type PostMessageEffect = Extract<GraphWebviewMessageEffect, { kind: 'postMessage' }>;
type UpdateAccessCountEffect = Extract<GraphWebviewMessageEffect, { kind: 'updateAccessCount' }>;

const WEBVIEW_MESSAGE_EFFECT_HANDLERS = {
  fitView: (_effect, handlers) => {
    handlers.fitView();
  },
  zoom: (effect, handlers) => {
    handlers.zoom2d((effect as ZoomEffect).factor);
  },
  cacheFileInfo: (effect, handlers) => {
    handlers.cacheFileInfo((effect as CacheFileInfoEffect).info);
  },
  updateTooltipInfo: (effect, handlers) => {
    handlers.updateTooltipInfo((effect as UpdateTooltipInfoEffect).info);
  },
  postMessage: (effect, handlers) => {
    handlers.postMessage((effect as PostMessageEffect).message);
  },
  openInEditor: (_effect, handlers) => {
    handlers.openInEditor();
  },
  exportPng: (_effect, handlers) => {
    handlers.exportPng();
  },
  exportSvg: (_effect, handlers) => {
    handlers.exportSvg();
  },
  exportJpeg: (_effect, handlers) => {
    handlers.exportJpeg();
  },
  exportJson: (_effect, handlers) => {
    handlers.exportJson();
  },
  exportMarkdown: (_effect, handlers) => {
    handlers.exportMarkdown();
  },
  updateAccessCount: (effect, handlers) => {
    const accessCountEffect = effect as UpdateAccessCountEffect;
    handlers.updateAccessCount(accessCountEffect.nodeId, accessCountEffect.accessCount);
  },
} satisfies Record<GraphWebviewMessageEffect['kind'], WebviewMessageEffectHandler>;

export function applyWebviewMessageEffects(
  effects: GraphWebviewMessageEffect[],
  handlers: GraphWebviewMessageEffectHandlers
): void {
  for (const effect of effects) {
    WEBVIEW_MESSAGE_EFFECT_HANDLERS[effect.kind](effect, handlers);
  }
}
