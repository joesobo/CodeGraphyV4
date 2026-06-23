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
  const localResourceRoots = getLocalResourceRoots();
  webviewView.webview.options = {
    enableScripts: true,
    localResourceRoots,
    retainContextWhenHidden: true,
  };

  setWebviewMessageListener(webviewView.webview);

  const html = getHtml(webviewView.webview);
  webviewView.webview.html = html;

  void executeCommand('setContext', 'codegraphy.viewVisible', webviewView.visible);

  webviewView.onDidChangeVisibility(() => {
    void executeCommand('setContext', 'codegraphy.viewVisible', webviewView.visible);
  });
}
