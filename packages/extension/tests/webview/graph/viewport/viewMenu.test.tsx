import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphContextMenuEntry } from '../../../../src/webview/components/graph/contextMenu/contracts';
import {
  renderViewport,
  resetViewHarness,
} from './viewFixture';

describe('Viewport context menu', () => {
  beforeEach(resetViewHarness);

  it('dispatches menu actions for item entries', () => {
    const handleMenuAction = vi.fn();
    renderViewport({ handleMenuAction });

    fireEvent.click(screen.getByRole('button', { name: /open file/i }));

    expect(handleMenuAction).toHaveBeenCalledWith({
      action: { kind: 'builtin', action: 'open' },
      contextSelection: { kind: 'node', targets: ['src/app.ts'] },
    });
    expect(screen.getByTestId('separator')).toBeInTheDocument();
  });

  it('changes the context menu signature when an entry label changes', () => {
    const contextSelection = { kind: 'node' as const, targets: ['src/app.ts'] };
    const addFavoriteEntry: GraphContextMenuEntry = {
      id: 'node-toggle-favorite',
      kind: 'item',
      label: 'Add to Favorites',
      action: { kind: 'builtin', action: 'toggleFavorite' },
      contextSelection,
    };
    const removeFavoriteEntry: GraphContextMenuEntry = {
      ...addFavoriteEntry,
      label: 'Remove from Favorites',
    };
    const rendered = renderViewport({ menuEntries: [addFavoriteEntry] });

    expect(document.querySelector('[data-menu-entries-signature]')).toHaveAttribute(
      'data-menu-entries-signature',
      'node-toggle-favorite:Add to Favorites',
    );

    rendered.rerenderViewport({ menuEntries: [removeFavoriteEntry] });

    expect(document.querySelector('[data-menu-entries-signature]')).toHaveAttribute(
      'data-menu-entries-signature',
      'node-toggle-favorite:Remove from Favorites',
    );
    expect(screen.getByRole('button', { name: 'Remove from Favorites' })).toBeInTheDocument();
  });
});
