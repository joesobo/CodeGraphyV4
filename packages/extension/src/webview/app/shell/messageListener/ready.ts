import { postMessage } from '../../../vscodeApi';
import { graphStore } from '../../../store/state';
import { recordWebviewPerformanceEvent } from '../../../performance/marks';

type WindowWithCodeGraphyReadyFlag = Window & {
  __codegraphyWebviewReadyPosted?: boolean;
};

export function postWebviewReadyOnce(targetWindow: Window): void {
  const codeGraphyWindow = targetWindow as WindowWithCodeGraphyReadyFlag;
  // Keep the ready handshake single-shot for one webview page load. This avoids
  // duplicate ready messages during React development replays such as StrictMode.
  if (!codeGraphyWindow.__codegraphyWebviewReadyPosted) {
    codeGraphyWindow.__codegraphyWebviewReadyPosted = true;
    graphStore.getState().beginInitialBootstrap();
    recordWebviewPerformanceEvent('webview.ready.posted');
    postMessage({ type: 'WEBVIEW_READY', payload: null });
  }
}

export function resetWebviewReadyPosted(targetWindow: Window): void {
  delete (targetWindow as WindowWithCodeGraphyReadyFlag).__codegraphyWebviewReadyPosted;
}
