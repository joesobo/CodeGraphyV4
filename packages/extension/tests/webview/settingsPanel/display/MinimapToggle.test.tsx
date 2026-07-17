import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MinimapToggle } from '../../../../src/webview/components/settingsPanel/display/MinimapToggle';

describe('MinimapToggle', () => {
  it('reports changes through its labeled switch', () => {
    const onCheckedChange = vi.fn();
    render(<MinimapToggle checked onCheckedChange={onCheckedChange} />);

    fireEvent.click(screen.getByLabelText('Show Minimap'));

    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });
});
