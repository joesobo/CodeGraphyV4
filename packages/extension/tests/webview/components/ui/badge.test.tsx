import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge, badgeVariants } from '../../../../src/webview/components/ui/badge';

describe('badgeVariants', () => {
  it('includes the shared base classes and default variant classes', () => {
    const classes = badgeVariants();

    expect(classes).toContain('inline-flex');
    expect(classes).toContain('items-center');
    expect(classes).toContain('rounded-md');
    expect(classes).toContain('border');
    expect(classes).toContain('bg-primary');
    expect(classes).toContain('text-primary-foreground');
    expect(classes).toContain('hover:bg-primary/80');
  });

  it.each([
    ['secondary', 'bg-secondary', 'text-secondary-foreground', 'hover:bg-secondary/80'],
    ['destructive', 'bg-destructive', 'text-destructive-foreground', 'hover:bg-destructive/80'],
    ['outline', 'text-foreground'],
  ] as const)('includes the %s variant classes', (variant, ...expectedClasses) => {
    const classes = badgeVariants({ variant });

    for (const expectedClass of expectedClasses) {
      expect(classes).toContain(expectedClass);
    }
  });
});

describe('Badge', () => {
  it('renders children and merges custom classes', () => {
    render(
      <Badge data-testid="badge" className="custom-badge">
        Synced
      </Badge>,
    );

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('Synced');
    expect(badge).toHaveClass('custom-badge');
    expect(badge).toHaveClass('inline-flex', 'rounded-md', 'font-semibold');
  });

  it('renders the requested variant classes on the component output', () => {
    render(
      <Badge data-testid="badge" variant="destructive">
        Error
      </Badge>,
    );

    expect(screen.getByTestId('badge')).toHaveClass(
      'border-transparent',
      'bg-destructive',
      'text-destructive-foreground',
      'hover:bg-destructive/80',
    );
  });
});
