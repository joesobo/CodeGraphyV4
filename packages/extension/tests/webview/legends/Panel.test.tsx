import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LegendsPanel from '../../../src/webview/components/legends/Panel';

vi.mock('../../../src/webview/components/settingsPanel/groups/Section', () => ({
  GroupsSection: () => <div data-testid="groups-section">Groups Section</div>,
}));

describe('LegendsPanel', () => {
  it('returns null when closed', () => {
    const { container } = render(<LegendsPanel isOpen={false} onClose={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the legends header and groups content when open', () => {
    render(<LegendsPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Legends')).toBeInTheDocument();
    expect(screen.getByTestId('groups-section')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();

    render(<LegendsPanel isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByTitle('Close'));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
