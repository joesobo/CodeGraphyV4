import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AccountView } from './view';

describe('CodeGraphy website account page', () => {
  it('shows the account email and active Pro package status', () => {
    render(<AccountView />);

    expect(screen.getByText('maya@codegraphy.dev')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Private plugins' })).toBeInTheDocument();
    expect(screen.getByText('Organize')).toBeInTheDocument();
    expect(
      screen.getByText('Sections, pinned nodes, saved setups, and advanced exports.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Customer portal coming soon' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Sign out' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByText('Free account')).not.toBeInTheDocument();
    expect(screen.queryByText('Private plugins enabled')).not.toBeInTheDocument();
  });
});
