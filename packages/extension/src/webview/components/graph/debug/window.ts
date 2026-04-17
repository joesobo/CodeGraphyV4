import type { GraphDebugSnapshot } from './types';

declare global {
  interface Window {
    __CODEGRAPHY_ENABLE_GRAPH_DEBUG__?: boolean;
    __CODEGRAPHY_GRAPH_DEBUG__?: {
      fitView(): void;
      fitViewWithPadding(padding: number): void;
      getSnapshot(): GraphDebugSnapshot;
    };
  }
}

export {};
