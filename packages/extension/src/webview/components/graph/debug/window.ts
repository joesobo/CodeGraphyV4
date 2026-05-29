import type { GraphDebugApi } from './contracts/protocol';

declare global {
  interface Window {
    __CODEGRAPHY_ENABLE_GRAPH_DEBUG__?: boolean;
    __CODEGRAPHY_GRAPH_DEBUG__?: GraphDebugApi;
  }
}

export {};
