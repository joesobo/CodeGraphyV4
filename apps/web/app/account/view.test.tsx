import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AccountView } from './view';

describe('CodeGraphy website account page', () => {
  it('shows the account email and active Pro package status', () => {
    render(<AccountView />);

    expect(screen.getByText('Account:')).toBeInTheDocument();
    expect(screen.getByText('maya@codegraphy.dev')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Private plugins' })).toBeInTheDocument();
    expect(screen.getByText('Organize: Active')).toBeInTheDocument();
    expect(screen.getByText('Sections')).toBeInTheDocument();
    expect(screen.getByText('Pinned nodes')).toBeInTheDocument();
    expect(screen.getByText('Saved setups')).toBeInTheDocument();
    expect(screen.getByText('Advanced exports')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Customer portal coming soon' })).toBeDisabled();
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  });
});
