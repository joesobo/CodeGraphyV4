import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('renders child links without nesting them inside a button element', () => {
    render(
      <Button asChild>
        <a href="/install">Install CodeGraphy</a>
      </Button>,
    );

    expect(screen.getByRole('link', { name: 'Install CodeGraphy' })).toHaveAttribute(
      'href',
      '/install',
    );
    expect(screen.queryByRole('button', { name: 'Install CodeGraphy' })).not.toBeInTheDocument();
  });
});
