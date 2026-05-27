import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthView } from './view';

describe('CodeGraphy website auth pages', () => {
  it('renders login with email, Google, GitHub, and signup navigation', () => {
    render(<AuthView mode="login" />);

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue with GitHub' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup');
  });

  it('renders signup without a confirm-password field and links back to login', () => {
    render(<AuthView mode="signup" />);

    expect(screen.getByRole('heading', { name: 'Create a free account' })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Password')).toHaveLength(1);
    expect(screen.queryByLabelText(/Confirm password/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });
});
