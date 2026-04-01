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
}

export function resolveGraphViewWebviewView(
  webviewView: GraphViewWebviewViewLike,
  {
    getLocalResourceRoots,
    setWebviewMessageListener,
    getHtml,
    executeCommand,
  }: ResolveGraphViewWebviewOptions,
): void {
  webviewView.webview.options = {
    enableScripts: true,
    localResourceRoots: getLocalResourceRoots(),
    retainContextWhenHidden: true,
  };

  setWebviewMessageListener(webviewView.webview);
  webviewView.webview.html = getHtml(webviewView.webview);

  void executeCommand('setContext', 'codegraphy.viewVisible', webviewView.visible);

  webviewView.onDidChangeVisibility(() => {
    void executeCommand('setContext', 'codegraphy.viewVisible', webviewView.visible);
  });
}
