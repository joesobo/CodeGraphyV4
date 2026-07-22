import type { Disposable } from '@codegraphy-dev/plugin-api/disposable';

export type GraphPluginSlot =
  | 'toolbar'
  | 'graph.toolbar'
  | 'graph.panelSlot'
  | 'theme.panel'
  | 'graph.stage.worldBackground'
  | 'graph.stage.worldOverlay'
  | 'graph.stage.viewportOverlay'
  | 'node-details'
  | 'tooltip'
  | 'graph-overlay';

export type WebviewPluginActivationCleanup = void | (() => void) | Disposable;

export type WebviewPluginActivate = (
  api: CodeGraphyWebviewAPI,
) => WebviewPluginActivationCleanup | Promise<WebviewPluginActivationCleanup>;

export type PluginSlotRenderCleanup = void | (() => void) | Disposable;

export interface PluginSlotRenderContext {
  api: CodeGraphyWebviewAPI;
}

export interface PluginSlotContribution {
  id: string;
  order?: number;
  render(
    container: HTMLDivElement,
    context: PluginSlotRenderContext,
  ): PluginSlotRenderCleanup;
}

export interface CodeGraphyWebviewAPI {
  getContainer(): HTMLDivElement;
  getSlotContainer(slot: GraphPluginSlot): HTMLDivElement;
  registerSlotContribution(slot: GraphPluginSlot, contribution: PluginSlotContribution): Disposable;
  getHostState(): Record<string, unknown>;
  getPluginData(): unknown;
  setPluginData(data: unknown): void;
  sendMessage(message: { type: string; data: unknown }): void;
  postHostMessage(message: unknown): void;
  onMessage(handler: (message: { type: string; data: unknown }) => void): Disposable;
}
