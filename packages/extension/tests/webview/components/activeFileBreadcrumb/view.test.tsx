import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { clearSentMessages, findMessage } from '../../../helpers/sentMessages';
import { ActiveFileBreadcrumb } from '../../../../src/webview/components/activeFileBreadcrumb/view';

describe('ActiveFileBreadcrumb', () => {
  beforeEach(() => {
    clearSentMessages();
  });

  it('renders the active file as breadcrumbs', () => {
    render(<ActiveFileBreadcrumb filePath="src/game/player.gd" />);

    expect(screen.getByRole('button', { name: 'Open src/game/player.gd' })).toBeInTheDocument();
    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.getByText('game')).toBeInTheDocument();
    expect(screen.getByText('player.gd')).toBeInTheDocument();
  });

  it('opens the active file when clicked', async () => {
    render(<ActiveFileBreadcrumb filePath="src/game/player.gd" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open src/game/player.gd' }));

    expect(findMessage('OPEN_FILE')).toEqual({
      type: 'OPEN_FILE',
      payload: { path: 'src/game/player.gd' },
    });
  });

  it('renders nothing without an active file', () => {
    const { container } = render(<ActiveFileBreadcrumb filePath={null} />);
    expect(container.firstChild).toBeNull();
  });
});
