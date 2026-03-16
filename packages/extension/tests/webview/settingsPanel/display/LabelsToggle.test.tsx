import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LabelsToggle } from '../../../../src/webview/components/settingsPanel/display/LabelsToggle';

describe('display LabelsToggle', () => {
  it('renders the current checked state', () => {
    render(<LabelsToggle checked={true} onCheckedChange={vi.fn()} />);

    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('forwards toggle changes', () => {
    const onCheckedChange = vi.fn();
    render(<LabelsToggle checked={true} onCheckedChange={onCheckedChange} />);

    fireEvent.click(screen.getByRole('switch'));

    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });
});
