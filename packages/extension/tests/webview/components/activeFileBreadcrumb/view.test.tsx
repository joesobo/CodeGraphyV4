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

    const button = screen.getByRole('button', { name: 'Open src/game/player.gd' });
    const src = screen.getByText('src');
    const game = screen.getByText('game');
    const file = screen.getByText('player.gd');

    expect(button).toBeInTheDocument();
    expect(screen.getAllByText('›')).toHaveLength(2);
    expect(src).toHaveClass('truncate', 'text-[var(--vscode-descriptionForeground,#9ca3af)]');
    expect(game).toHaveClass('truncate', 'text-[var(--vscode-descriptionForeground,#9ca3af)]');
    expect(file).toHaveClass('truncate', 'font-medium', 'text-[var(--vscode-foreground,#d4d4d4)]');
  });

  it('filters empty breadcrumb segments from repeated or leading slashes', () => {
    render(<ActiveFileBreadcrumb filePath="/src//game/player.gd/" />);

    expect(screen.getAllByText('›')).toHaveLength(2);
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
