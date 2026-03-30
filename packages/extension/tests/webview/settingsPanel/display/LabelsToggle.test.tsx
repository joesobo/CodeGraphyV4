import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LabelsToggle } from '../../../../src/webview/components/settingsPanel/display/LabelsToggle';

describe('display LabelsToggle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('ignores invalid toggle handlers at runtime', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <LabelsToggle
        checked={true}
        onCheckedChange={undefined as unknown as (checked: boolean) => void}
      />
    );

    expect(() => fireEvent.click(screen.getByRole('switch'))).not.toThrow();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
