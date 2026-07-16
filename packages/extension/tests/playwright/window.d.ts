import type { GraphDebugApi } from '../../src/webview/components/graph/debug/contracts/protocol';

declare global {
  interface Window {
    __CODEGRAPHY_GRAPH_DEBUG__?: GraphDebugApi;
  }
}

export {};
