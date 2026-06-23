interface GraphViewWebviewLike {
  options: {
    enableScripts?: boolean;
    localResourceRoots?: readonly unknown[];
    retainContextWhenHidden?: boolean;
  };
  html: string;
}

interface GraphViewWebviewViewLike {
  visible: boolean;
  webview: GraphViewWebviewLike;
  onDidChangeVisibility(handler: () => void): unknown;
}

interface ResolveGraphViewWebviewOptions {
  getLocalResourceRoots: () => readonly unknown[];
  setWebviewMessageListener: (webview: GraphViewWebviewLike) => void;
  getHtml: (webview: GraphViewWebviewLike) => string;
  executeCommand: (command: string, key: string, value: boolean) => unknown;
  recordPerformanceEvent?: (name: string, detail?: Record<string, unknown>) => void;
}

export function resolveGraphViewWebviewView(
  webviewView: GraphViewWebviewViewLike,
  {
    getLocalResourceRoots,
    setWebviewMessageListener,
    getHtml,
    executeCommand,
    recordPerformanceEvent,
  }: ResolveGraphViewWebviewOptions,
): void {
  recordPerformanceEvent?.('graphWebview.resolve.start', {
    visible: webviewView.visible,
  });
  recordPerformanceEvent?.('graphWebview.options.start');
  const localResourceRoots = getLocalResourceRoots();
  webviewView.webview.options = {
    enableScripts: true,
    localResourceRoots,
    retainContextWhenHidden: true,
  };
  recordPerformanceEvent?.('graphWebview.options.end', {
    localResourceRootCount: localResourceRoots.length,
  });

  recordPerformanceEvent?.('graphWebview.listener.start');
  setWebviewMessageListener(webviewView.webview);
  recordPerformanceEvent?.('graphWebview.listener.end');

  recordPerformanceEvent?.('graphWebview.html.start');
  const html = getHtml(webviewView.webview);
  webviewView.webview.html = html;
  recordPerformanceEvent?.('graphWebview.html.assigned', {
    htmlLength: html.length,
  });

  void executeCommand('setContext', 'codegraphy.viewVisible', webviewView.visible);
  recordPerformanceEvent?.('graphWebview.context.initial');
  recordPerformanceEvent?.('graphWebview.resolve.end');

  webviewView.onDidChangeVisibility(() => {
    void executeCommand('setContext', 'codegraphy.viewVisible', webviewView.visible);
  });
}
