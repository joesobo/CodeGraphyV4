import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Separator } from '../../../../src/webview/components/ui/separator';

describe('Separator', () => {
  it('renders the default horizontal decorative separator', () => {
    render(<Separator data-testid="separator" className="custom-separator" />);

    const separator = screen.getByTestId('separator');
    expect(separator).toHaveAttribute('data-orientation', 'horizontal');
    expect(separator).toHaveClass('shrink-0', 'bg-border', 'h-[1px]', 'w-full', 'custom-separator');
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('renders a vertical semantic separator when decorative is false', () => {
    render(<Separator orientation="vertical" decorative={false} />);

    const separator = screen.getByRole('separator');
    expect(separator).toHaveAttribute('data-orientation', 'vertical');
    expect(separator).toHaveAttribute('aria-orientation', 'vertical');
    expect(separator).toHaveClass('shrink-0', 'bg-border', 'h-full', 'w-[1px]');
  });
});
