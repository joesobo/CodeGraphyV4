import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import { getGraphWebviewMessageEffects, type GraphWebviewMessageEffect } from './effects/routing';
import type { FGLink, FGNode } from '../model/build';

export interface GraphMessageListenerOptions {
  applyEffects: (effects: GraphWebviewMessageEffect[]) => void;
  getGraphLinks: () => readonly FGLink[];
  getGraphNodes: () => Array<Pick<FGNode, 'id' | 'size' | 'x' | 'y'>>;
  tooltipPath: string | null;
}

export function createGraphMessageListener({
  applyEffects,
  getGraphLinks,
  getGraphNodes,
  tooltipPath,
}: GraphMessageListenerOptions): (event: MessageEvent<ExtensionToWebviewMessage>) => void {
  return (event) => {
    applyEffects(
      getGraphWebviewMessageEffects({
        message: event.data,
        tooltipPath,
        graphLinks: getGraphLinks(),
        graphNodes: getGraphNodes(),
      }),
    );
  };
}
