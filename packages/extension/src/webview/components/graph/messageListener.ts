import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import { getGraphWebviewMessageEffects, type GraphWebviewMessageEffect } from './messages/effects';
import type { FGNode } from './model/build';

export interface GraphMessageListenerOptions {
  applyEffects: (effects: GraphWebviewMessageEffect[]) => void;
  graphMode: '2d' | '3d';
  getGraphNodes: () => Array<Pick<FGNode, 'id' | 'size' | 'x' | 'y'>>;
  tooltipPath: string | null;
}

export function createGraphMessageListener({
  applyEffects,
  graphMode,
  getGraphNodes,
  tooltipPath,
}: GraphMessageListenerOptions): (event: MessageEvent<ExtensionToWebviewMessage>) => void {
  return (event) => {
    applyEffects(
      getGraphWebviewMessageEffects({
        message: event.data,
        graphMode,
        tooltipPath,
        graphNodes: getGraphNodes(),
      }),
    );
  };
}
