import { postMessage } from '../../../vscodeApi';
import { graphStore } from '../../../store/state';
import { recordWebviewPerformanceEvent } from '../../../performance/marks';

type WindowWithCodeGraphyReadyFlag = Window & {
  __codegraphyWebviewReadyPosted?: boolean;
  __codegraphyWebviewPageId?: string;
};

function createWebviewPageId(targetWindow: Window): string {
  if (typeof targetWindow.crypto?.randomUUID === 'function') {
    return targetWindow.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getWebviewPageId(targetWindow: Window): string {
  const codeGraphyWindow = targetWindow as WindowWithCodeGraphyReadyFlag;
  codeGraphyWindow.__codegraphyWebviewPageId ??= createWebviewPageId(targetWindow);
  return codeGraphyWindow.__codegraphyWebviewPageId;
}

export function postWebviewReadyOnce(targetWindow: Window): void {
  const codeGraphyWindow = targetWindow as WindowWithCodeGraphyReadyFlag;
  // Keep the ready handshake single-shot for one webview page load. This avoids
  // duplicate ready messages during React development replays such as StrictMode.
  if (!codeGraphyWindow.__codegraphyWebviewReadyPosted) {
    const pageId = getWebviewPageId(targetWindow);
    codeGraphyWindow.__codegraphyWebviewReadyPosted = true;
    graphStore.getState().beginInitialBootstrap();
    recordWebviewPerformanceEvent('webview.ready.posted', { pageId });
    postMessage({
      type: 'WEBVIEW_READY',
      payload: { pageId, postedAt: Date.now() },
    });
  }
}

export function resetWebviewReadyPosted(targetWindow: Window): void {
  delete (targetWindow as WindowWithCodeGraphyReadyFlag).__codegraphyWebviewReadyPosted;
}
