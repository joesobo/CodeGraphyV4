import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Label } from '../../../../../src/webview/components/ui/form/label';

describe('Label', () => {
  it('renders the base label classes and merges custom class names', () => {
    render(
      <Label data-testid="label" className="custom-label" htmlFor="name">
        Name
      </Label>,
    );

    const label = screen.getByTestId('label');

    expect(label).toHaveTextContent('Name');
    expect(label).toHaveAttribute('for', 'name');
    expect(label).toHaveClass(
      'text-sm',
      'font-medium',
      'leading-none',
      'peer-disabled:cursor-not-allowed',
      'peer-disabled:opacity-70',
      'custom-label',
    );
  });
});
