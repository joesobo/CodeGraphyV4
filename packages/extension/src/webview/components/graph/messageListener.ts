import type { ExtensionToWebviewMessage } from '../../../shared/contracts';
import { getGraphWebviewMessageEffects, type GraphWebviewMessageEffect } from '../graphWebviewMessages/effects';
import type { FGNode } from '../graphModel';

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
