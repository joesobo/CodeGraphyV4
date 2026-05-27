import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AccountView } from './view';

describe('CodeGraphy website account page', () => {
  it('shows the account email and active Pro package status', () => {
    render(<AccountView />);

    expect(screen.getByText('Account: maya@codegraphy.dev')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pro packages' })).toBeInTheDocument();
    expect(screen.getByText('Organize: Active')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stripe customer portal coming later' })).toBeDisabled();
  });
});
