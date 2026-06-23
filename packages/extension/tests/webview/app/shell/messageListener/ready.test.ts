import { beforeEach, describe, expect, it, vi } from 'vitest';
import { postWebviewReadyOnce } from '../../../../../src/webview/app/shell/messageListener/ready';
import { graphStore } from '../../../../../src/webview/store/state';

vi.mock('../../../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

import { postMessage } from '../../../../../src/webview/vscodeApi';

describe('app/shell/messageListener/ready', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    delete (window as Window & {
      __codegraphyWebviewReadyPosted?: boolean;
      __codegraphyWebviewPageId?: string;
    }).__codegraphyWebviewReadyPosted;
    delete (window as Window & {
      __codegraphyWebviewReadyPosted?: boolean;
      __codegraphyWebviewPageId?: string;
    }).__codegraphyWebviewPageId;
  });

  it('posts webview ready only once per window lifecycle', () => {
    const beginInitialBootstrap = vi.spyOn(graphStore.getState(), 'beginInitialBootstrap');

    postWebviewReadyOnce(window);
    postWebviewReadyOnce(window);

    expect(beginInitialBootstrap).toHaveBeenCalledOnce();
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'WEBVIEW_READY',
      payload: { pageId: expect.any(String), postedAt: expect.any(Number) },
    });
  });

});
