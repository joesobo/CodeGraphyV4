import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ModeButtons } from '../../../../src/webview/components/settingsPanel/display/ModeButtons';

describe('display ModeButtons', () => {
  it('renders button labels and pressed state', () => {
    render(
      <ModeButtons
        label="Direction"
        onSelect={vi.fn()}
        options={[
          { value: 'arrows', label: 'Arrows', pressed: true, variant: 'default' },
          { value: 'none', label: 'None', pressed: false, variant: 'outline' },
        ]}
      />
    );

    expect(screen.getByText('Direction')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Arrows' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'None' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('forwards the selected value', () => {
    const onSelect = vi.fn();
    render(
      <ModeButtons
        label="Direction"
        onSelect={onSelect}
        options={[
          { value: 'particles', label: 'Particles', pressed: false, variant: 'outline' },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Particles' }));

    expect(onSelect).toHaveBeenCalledWith('particles');
  });
});
