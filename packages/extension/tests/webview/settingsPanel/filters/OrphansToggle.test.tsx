import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrphansToggle } from '../../../../src/webview/components/settingsPanel/filters/OrphansToggle';

describe('OrphansToggle', () => {
  it('renders the show-orphans switch with the current value', () => {
    render(<OrphansToggle onCheckedChange={vi.fn()} showOrphans={true} />);

    expect(screen.getByLabelText('Show Orphans')).toBeChecked();
  });

  it('forwards switch changes', () => {
    const onCheckedChange = vi.fn();
    render(<OrphansToggle onCheckedChange={onCheckedChange} showOrphans={true} />);

    fireEvent.click(screen.getByRole('switch'));

    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });
});
