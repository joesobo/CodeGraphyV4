import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SectionHeader } from '../../../src/webview/components/settingsPanel/SectionHeader';

describe('SectionHeader', () => {
  it('renders the section title', () => {
    render(<SectionHeader title="Display" open={false} onToggle={vi.fn()} />);

    expect(screen.getByText('Display')).toBeInTheDocument();
  });

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(<SectionHeader title="Groups" open={false} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button', { name: /Groups/i }));

    expect(onToggle).toHaveBeenCalled();
  });

  it('rotates the chevron when the section is open', () => {
    const { rerender } = render(<SectionHeader title="Forces" open={false} onToggle={vi.fn()} />);

    expect(screen.getByTestId('settings-panel-chevron')).toHaveClass('text-muted-foreground');
    expect(screen.getByTestId('settings-panel-chevron')).not.toHaveClass('rotate-90');

    rerender(<SectionHeader title="Forces" open={true} onToggle={vi.fn()} />);

    expect(screen.getByTestId('settings-panel-chevron')).toHaveClass('rotate-90');
  });
});
