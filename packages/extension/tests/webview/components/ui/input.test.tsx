import React, { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from '../../../../src/webview/components/ui/input';

describe('Input', () => {
  it('forwards props, classes, and refs to the input element', () => {
    const ref = createRef<HTMLInputElement>();

    render(
      <Input
        ref={ref}
        type="email"
        placeholder="Email"
        disabled
        className="custom-input"
      />,
    );

    const input = screen.getByPlaceholderText('Email');
    expect(ref.current).toBe(input);
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toBeDisabled();
    expect(input).toHaveClass(
      'flex',
      'h-9',
      'w-full',
      'rounded-md',
      'border',
      'border-input',
      'placeholder:text-muted-foreground',
      'md:text-sm',
      'custom-input',
    );
  });
});
