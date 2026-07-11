import { useSyncExternalStore } from 'react';

type VisibilityListener = () => void;

let graphViewVisible = true;
const listeners = new Set<VisibilityListener>();

export function setGraphViewVisible(visible: boolean): void {
  if (visible === graphViewVisible) return;
  graphViewVisible = visible;
  listeners.forEach(listener => listener());
}

export function getGraphViewVisible(): boolean {
  return graphViewVisible;
}

function subscribeGraphViewVisibility(listener: VisibilityListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGraphViewVisible(): boolean {
  return useSyncExternalStore(
    subscribeGraphViewVisibility,
    getGraphViewVisible,
    getGraphViewVisible,
  );
}
