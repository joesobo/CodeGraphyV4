import { describe, expect, it } from 'vitest';
import {
  act,
  clearSentMessages,
  findMessage,
  fireEvent,
  openNodeMenu,
  screen,
  setupGraphContextMenuTest,
  symbolData,
  waitFor,
} from './harness';

describe('Graph node context menu symbol actions', () => {
  setupGraphContextMenuTest();

  it('shows symbol actions without file mutation actions', async () => {
    await openNodeMenu(symbolData, 'src/app.ts#start:function');

    await waitFor(() => {
      expect(screen.getByText('Go to Symbol')).toBeInTheDocument();
    });

    expect(screen.getByText('Reveal File')).toBeInTheDocument();
    expect(screen.getByText('Copy Symbol ID')).toBeInTheDocument();
    expect(screen.getByText('Copy Symbol Name')).toBeInTheDocument();
    expect(screen.getByText('Add to Favorites')).toBeInTheDocument();
    expect(screen.queryByText('Open File')).not.toBeInTheDocument();
    expect(screen.queryByText('Rename')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete File')).not.toBeInTheDocument();
  });

  it('posts symbol actions with symbol identity and containing file', async () => {
    await openNodeMenu(symbolData, 'src/app.ts#start:function');
    await waitFor(() => {
      expect(screen.getByText('Go to Symbol')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Go to Symbol'));
    });
    expect(findMessage('OPEN_FILE')?.payload.path).toBe('src/app.ts#start:function');

    await openNodeMenu(symbolData, 'src/app.ts#start:function');
    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Copy Symbol Name'));
    });
    expect(findMessage('COPY_TO_CLIPBOARD')?.payload.text).toBe('start');

    await openNodeMenu(symbolData, 'src/app.ts#start:function');
    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Copy Symbol ID'));
    });
    expect(findMessage('COPY_TO_CLIPBOARD')?.payload.text).toBe('src/app.ts#start:function');

    await openNodeMenu(symbolData, 'src/app.ts#start:function');
    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Add to Favorites'));
    });
    expect(findMessage('TOGGLE_FAVORITE')?.payload.paths).toEqual(['src/app.ts#start:function']);
  });
});
