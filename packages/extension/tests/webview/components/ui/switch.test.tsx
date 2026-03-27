import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Switch } from '../../../../src/webview/components/ui/switch';

describe('Switch', () => {
  it('renders the switch root and thumb classes for a checked control', () => {
    render(<Switch defaultChecked disabled className="custom-switch" />);

    const switchElement = screen.getByRole('switch');
    expect(switchElement).toBeDisabled();
    expect(switchElement).toHaveAttribute('data-state', 'checked');
    expect(switchElement).toHaveClass(
      'peer',
      'inline-flex',
      'h-5',
      'w-9',
      'cursor-pointer',
      'rounded-full',
      'data-[state=checked]:bg-primary',
      'data-[state=unchecked]:bg-input',
      'custom-switch',
    );

    const thumb = switchElement.querySelector('span');
    expect(thumb).not.toBeNull();
    expect(thumb).toHaveClass(
      'pointer-events-none',
      'block',
      'h-4',
      'w-4',
      'rounded-full',
      'bg-background',
      'shadow-lg',
      'data-[state=checked]:translate-x-4',
      'data-[state=unchecked]:translate-x-0',
    );
  });
});
