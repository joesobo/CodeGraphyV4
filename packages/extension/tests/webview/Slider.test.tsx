import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Slider } from '../../src/webview/components/ui/slider';

describe('Slider', () => {
  it('shows pointer cursor on interactive slider controls', () => {
    const { container } = render(
      <Slider
        value={[50]}
        min={0}
        max={100}
        step={1}
        onValueChange={() => undefined}
      />
    );

    const root = container.firstElementChild as HTMLElement;
    const thumb = screen.getByRole('slider');
    const track = root.firstElementChild as HTMLElement;

    expect(root).toHaveClass('cursor-pointer');
    expect(track).toHaveClass('cursor-pointer');
    expect(thumb).toHaveClass('cursor-pointer');
  });

  it('includes a disabled cursor state for non-interactive sliders', () => {
    const { container } = render(
      <Slider
        value={[50]}
        min={0}
        max={100}
        step={1}
        onValueChange={() => undefined}
        disabled
      />
    );

    const root = container.firstElementChild as HTMLElement;

    expect(root).toHaveAttribute('data-disabled');
    expect(root).toHaveClass('data-[disabled]:cursor-not-allowed');
    expect(root).toHaveClass('data-[disabled]:[&_*]:cursor-not-allowed');
  });
});
