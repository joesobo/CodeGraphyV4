import type { GraphStageEscapeAdapter } from './coordinator';

export interface GraphStageEscapeBridge extends GraphStageEscapeAdapter {
  attach(adapter: GraphStageEscapeAdapter): () => void;
}

export function createGraphStageEscapeBridge(): GraphStageEscapeBridge {
  let current: GraphStageEscapeAdapter | null = null;

  return {
    attach(adapter) {
      current = adapter;
      return () => {
        if (current === adapter) current = null;
      };
    },
    clearSelection() {
      current?.clearSelection();
    },
    focus() {
      current?.focus();
    },
    hasSelection() {
      return current?.hasSelection() ?? false;
    },
  };
}
