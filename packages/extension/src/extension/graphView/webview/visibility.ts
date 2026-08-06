interface VisibilityWebview {
  postMessage(message: unknown): unknown;
}

export function publishGraphViewVisibility(
  webview: VisibilityWebview,
  visible: boolean,
): void {
  void webview.postMessage({
    type: 'GRAPH_VIEW_VISIBILITY_UPDATED',
    payload: { visible },
  });
}
