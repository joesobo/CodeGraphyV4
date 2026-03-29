import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button, buttonVariants } from '../../../../src/webview/components/ui/button';

describe('buttonVariants', () => {
  it('includes the shared base classes and default variant classes', () => {
    const classes = buttonVariants();

    expect(classes).toContain('inline-flex');
    expect(classes).toContain('items-center');
    expect(classes).toContain('justify-center');
    expect(classes).toContain('rounded-md');
    expect(classes).toContain('bg-primary');
    expect(classes).toContain('text-primary-foreground');
    expect(classes).toContain('hover:bg-primary/90');
  });

  it.each([
    ['destructive', 'bg-destructive', 'text-destructive-foreground', 'hover:bg-destructive/90'],
    ['outline', 'border', 'bg-background', 'hover:bg-accent', 'hover:text-accent-foreground'],
    ['secondary', 'bg-secondary', 'text-secondary-foreground', 'hover:bg-secondary/80'],
    ['ghost', 'hover:bg-accent', 'hover:text-accent-foreground'],
    ['link', 'text-primary', 'underline-offset-4', 'hover:underline'],
  ] as const)('includes the %s variant classes', (variant, ...expectedClasses) => {
    const classes = buttonVariants({ variant });

    for (const expectedClass of expectedClasses) {
      expect(classes).toContain(expectedClass);
    }
  });

  it.each([
    ['sm', 'h-8', 'px-3', 'text-xs'],
    ['lg', 'h-10', 'px-8'],
    ['icon', 'h-9', 'w-9'],
  ] as const)('includes the %s size classes', (size, ...expectedClasses) => {
    const classes = buttonVariants({ size });

    for (const expectedClass of expectedClasses) {
      expect(classes).toContain(expectedClass);
    }
  });

  it('merges caller-supplied class names', () => {
    const classes = buttonVariants({ className: 'custom-button' });

    expect(classes).toContain('custom-button');
  });
});

describe('Button', () => {
  it('renders a button element and merges custom classes', () => {
    render(
      <Button data-testid="button" className="custom-button">
        Click me
      </Button>,
    );

    const button = screen.getByTestId('button');
    expect(button).toHaveTextContent('Click me');
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveClass('custom-button');
    expect(button).toHaveClass('inline-flex', 'rounded-md', 'font-medium');
  });

  it('renders children as the slotted element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/docs" data-testid="button-link">
          Docs
        </a>
      </Button>,
    );

    const link = screen.getByTestId('button-link');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/docs');
    expect(link).toHaveClass('inline-flex', 'rounded-md', 'font-medium');
  });
});
