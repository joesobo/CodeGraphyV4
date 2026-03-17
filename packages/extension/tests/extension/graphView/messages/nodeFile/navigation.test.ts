import { describe, expect, it, vi } from 'vitest';
import {
  applyNodeFileNavigationMessage,
  type GraphViewNodeFileNavigationHandlers,
} from '../../../../../src/extension/graphView/messages/nodeFile/navigation';

function createHandlers(
  overrides: Partial<GraphViewNodeFileNavigationHandlers> = {},
): GraphViewNodeFileNavigationHandlers {
  return {
    revealInExplorer: vi.fn(() => Promise.resolve()),
    copyToClipboard: vi.fn(() => Promise.resolve()),
    analyzeAndSendData: vi.fn(() => Promise.resolve()),
    getFileInfo: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('graph view node/file navigation message', () => {
  it('reveals a file in the explorer', async () => {
    const handlers = createHandlers();

    const handled = await applyNodeFileNavigationMessage(
      { type: 'REVEAL_IN_EXPLORER', payload: { path: 'src/app.ts' } },
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.revealInExplorer).toHaveBeenCalledWith('src/app.ts');
  });

  it('copies text to the clipboard', async () => {
    const handlers = createHandlers();

    const handled = await applyNodeFileNavigationMessage(
      { type: 'COPY_TO_CLIPBOARD', payload: { text: 'src/app.ts' } },
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.copyToClipboard).toHaveBeenCalledWith('src/app.ts');
  });

  it('awaits graph refresh requests', async () => {
    let finished = false;
    const handlers = createHandlers({
      analyzeAndSendData: vi.fn(async () => {
        await Promise.resolve();
        finished = true;
      }),
    });

    const handled = await applyNodeFileNavigationMessage({ type: 'REFRESH_GRAPH' }, handlers);

    expect(handled).toBe(true);
    expect(finished).toBe(true);
  });

  it('requests file info', async () => {
    const handlers = createHandlers();

    const handled = await applyNodeFileNavigationMessage(
      { type: 'GET_FILE_INFO', payload: { path: 'src/app.ts' } },
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.getFileInfo).toHaveBeenCalledWith('src/app.ts');
  });

  it('returns false for unrelated messages', async () => {
    const handlers = createHandlers();

    const handled = await applyNodeFileNavigationMessage(
      { type: 'OPEN_FILE', payload: { path: 'src/app.ts' } },
      handlers,
    );

    expect(handled).toBe(false);
  });
});
