import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState, LoadingState } from '../../../src/webview/app/states';

describe('app/states', () => {
  it('renders the loading state copy', () => {
    render(<LoadingState />);

    expect(screen.getByText('CodeGraphy')).toBeInTheDocument();
    expect(screen.getByText('Loading graph...')).toBeInTheDocument();
  });

  it('renders the empty state copy with the provided hint', () => {
    render(<EmptyState hint="Enable Show Orphans to reveal hidden files." />);

    expect(screen.getByText('CodeGraphy')).toBeInTheDocument();
    expect(
      screen.getByText('No files found. Enable Show Orphans to reveal hidden files.'),
    ).toBeInTheDocument();
  });
});
