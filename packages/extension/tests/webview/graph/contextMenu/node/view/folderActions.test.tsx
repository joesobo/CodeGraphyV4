import { describe, expect, it } from 'vitest';
import {
  act,
  clearSentMessages,
  findMessage,
  fireEvent,
  folderData,
  openNodeMenu,
  screen,
  setupGraphContextMenuTest,
  waitFor,
} from './harness';

describe('Graph node context menu folder actions', () => {
  setupGraphContextMenuTest();

  it('shows folder actions without file-only actions', async () => {
    await openNodeMenu(folderData, 'src');

    await waitFor(() => {
      expect(screen.getByText('New Folder')).toBeInTheDocument();
    });

    expect(screen.getByText('New File')).toBeInTheDocument();
    expect(screen.getByText('Reveal in Explorer')).toBeInTheDocument();
    expect(screen.getByText('Copy Relative Path')).toBeInTheDocument();
    expect(screen.getByText('Copy Absolute Path')).toBeInTheDocument();
    expect(screen.getByText('Rename Folder')).toBeInTheDocument();
    expect(screen.getByText('Delete Folder')).toBeInTheDocument();
    expect(screen.queryByText('Open File')).not.toBeInTheDocument();
  });

  it('posts Rename Folder and Delete Folder messages with the folder path', async () => {
    await openNodeMenu(folderData, 'src');
    await waitFor(() => {
      expect(screen.getByText('Rename Folder')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Rename Folder'));
    });
    expect(findMessage('RENAME_FILE')?.payload.path).toBe('src');

    await openNodeMenu(folderData, 'src');
    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Delete Folder'));
    });
    expect(findMessage('DELETE_FILES')?.payload.paths).toEqual(['src']);
  });

  it('posts New Folder messages with the folder path', async () => {
    await openNodeMenu(folderData, 'src');
    await waitFor(() => {
      expect(screen.getByText('New Folder')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('New Folder'));
    });

    expect(findMessage('CREATE_FOLDER')?.payload.directory).toBe('src');
  });

  it('posts New File messages with the folder path', async () => {
    await openNodeMenu(folderData, 'src');
    await waitFor(() => {
      expect(screen.getByText('New File')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('New File'));
    });

    expect(findMessage('CREATE_FILE')?.payload.directory).toBe('src');
  });
});
