import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FileMutationToast } from '../../../../src/webview/components/graph/fileMutationToast/view';
import { graphStore } from '../../../../src/webview/store/state';

describe('file mutation toast', () => {
  afterEach(() => {
    vi.useRealTimers();
    graphStore.setState({ fileMutationError: null });
  });

  it('shows a failure and dismisses it after five seconds', () => {
    vi.useFakeTimers();
    graphStore.setState({ fileMutationError: 'rename failed' });
    render(<FileMutationToast />);

    expect(screen.getByRole('alert')).toHaveTextContent('File operation failed: rename failed');
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
