interface GraphViewWebviewLike {
  options: {
    enableScripts?: boolean;
    localResourceRoots?: readonly unknown[];
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
  sendAllSettings: () => void;
  analyzeAndSendData: () => Promise<void>;
  log: (message: string) => void;
}

export function resolveGraphViewWebviewView(
  webviewView: GraphViewWebviewViewLike,
  {
    getLocalResourceRoots,
    setWebviewMessageListener,
    getHtml,
    executeCommand,
    sendAllSettings,
    analyzeAndSendData,
    log,
  }: ResolveGraphViewWebviewOptions,
): void {
  webviewView.webview.options = {
    enableScripts: true,
    localResourceRoots: getLocalResourceRoots(),
  };

  setWebviewMessageListener(webviewView.webview);
  webviewView.webview.html = getHtml(webviewView.webview);

  void executeCommand('setContext', 'codegraphy.viewVisible', webviewView.visible);

  webviewView.onDidChangeVisibility(() => {
    void executeCommand('setContext', 'codegraphy.viewVisible', webviewView.visible);

    if (webviewView.visible) {
      log('[CodeGraphy] View became visible, re-sending data');
      sendAllSettings();
      void analyzeAndSendData();
    }
  });
}
