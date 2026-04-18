import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState, LoadingState } from '../../../../src/webview/app/shell/states';

describe('app/states', () => {
  it('renders the loading state copy', () => {
    const { container } = render(<LoadingState />);

    expect(screen.getByText('CodeGraphy')).toBeInTheDocument();
    expect(screen.getByText('Loading graph...')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass(
      'flex',
      'flex-col',
      'items-center',
      'justify-center',
      'min-h-screen',
      'p-4',
    );
  });

  it('renders the empty state copy with the provided hint in fullscreen mode by default', () => {
    const { container } = render(<EmptyState hint="Enable Show Orphans to reveal hidden files." />);

    expect(screen.getByText('CodeGraphy')).toBeInTheDocument();
    expect(
      screen.getByText('No files found. Enable Show Orphans to reveal hidden files.'),
    ).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass(
      'flex',
      'flex-col',
      'items-center',
      'justify-center',
      'min-h-screen',
      'p-4',
    );
  });

  it('renders the empty state in compact mode when fullscreen is disabled', () => {
    const { container } = render(
      <EmptyState
        hint="Switch views to inspect the current selection."
        fullScreen={false}
      />,
    );

    expect(
      screen.getByText('No files found. Switch views to inspect the current selection.'),
    ).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass(
      'flex',
      'h-full',
      'flex-col',
      'items-center',
      'justify-center',
      'p-4',
    );
    expect(container.firstElementChild).not.toHaveClass('min-h-screen');
  });
});
