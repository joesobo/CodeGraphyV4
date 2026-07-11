import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { graphStore } from '../../../../src/webview/store/state';
import { createInlineRenameSession } from '../../../../src/webview/components/graph/inlineEdit/model';
import { GraphInlineEdit } from '../../../../src/webview/components/graph/inlineEdit/view';

describe('GraphInlineEdit', () => {
  beforeEach(() => graphStore.setState({ inlineEdit: null }));

  it('selects the basename and commits Enter through the named protocol', () => {
    const postMessage = vi.fn();
    graphStore.setState({ inlineEdit: createInlineRenameSession('src/app.ts') });
    render(<GraphInlineEdit position={{ x: 12, y: 24 }} postMessage={postMessage} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveFocus();
    expect((input as HTMLInputElement).selectionStart).toBe(0);
    expect((input as HTMLInputElement).selectionEnd).toBe(3);
    fireEvent.change(input, { target: { value: 'main.ts' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(postMessage).toHaveBeenCalledWith({
      type: 'RENAME_FILE',
      payload: { path: 'src/app.ts', newName: 'main.ts' },
    });
    expect(graphStore.getState().inlineEdit).toMatchObject({ pending: true, value: 'main.ts' });
  });

  it('cancels on Escape without committing', () => {
    const postMessage = vi.fn();
    graphStore.setState({ inlineEdit: createInlineRenameSession('src/app.ts') });
    render(<GraphInlineEdit position={{ x: 12, y: 24 }} postMessage={postMessage} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(postMessage).not.toHaveBeenCalled();
    expect(graphStore.getState().inlineEdit).toBeNull();
  });

  it('keeps invalid input visible with an inline error', async () => {
    graphStore.setState({ inlineEdit: createInlineRenameSession('src/app.ts') });
    render(<GraphInlineEdit position={{ x: 12, y: 24 }} postMessage={vi.fn()} />);
    const input = screen.getByRole('textbox');
    await new Promise(resolve => setTimeout(resolve, 0));
    fireEvent.change(input, { target: { value: '../main.ts' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert')).toHaveTextContent('not valid as a file or folder name');
    expect(graphStore.getState().inlineEdit).not.toBeNull();
  });
});
