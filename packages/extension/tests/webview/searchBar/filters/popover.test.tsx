import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FilterPopover } from '../../../../src/webview/components/searchBar/filters/popover';

const sentMessages: Array<{ type: string; payload?: unknown }> = [];

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: (message: { type: string; payload?: unknown }) => sentMessages.push(message),
}));

function renderPopover(overrides: Partial<React.ComponentProps<typeof FilterPopover>> = {}) {
  const props: React.ComponentProps<typeof FilterPopover> = {
    disabledCustomPatterns: [],
    disabledPluginPatterns: [],
    customPatterns: ['existing/**'],
    excludedCount: 4,
    onDisabledCustomPatternsChange: vi.fn(),
    onDisabledPluginPatternsChange: vi.fn(),
    onOpenChange: vi.fn(),
    onPatternsChange: vi.fn(),
    open: true,
    pendingPatterns: [],
    pluginPatterns: ['plugin/**'],
    ...overrides,
  };

  render(<FilterPopover {...props} />);
  return props;
}

describe('searchBar/filters/popover', () => {
  beforeEach(() => {
    sentMessages.length = 0;
  });

  it('renders enabled source counts and excluded subtext', () => {
    renderPopover();

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('2 enabled')).toBeInTheDocument();
    expect(screen.getByText('4 excluded from graph')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Plugin defaults')).toBeInTheDocument();
  });

  it('adds pending filter globs without closing the popover', () => {
    const props = renderPopover({ pendingPatterns: ['**/src/app.ts'] });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(props.onPatternsChange).toHaveBeenCalledWith(['existing/**', '**/src/app.ts']);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERNS',
      payload: { patterns: ['existing/**', '**/src/app.ts'] },
    });
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('persists individual pattern toggle changes', () => {
    const props = renderPopover();

    fireEvent.click(screen.getByLabelText('Disable custom filter existing/**'));
    fireEvent.click(screen.getByLabelText('Disable plugin filter plugin/**'));

    expect(props.onDisabledCustomPatternsChange).toHaveBeenCalledWith(['existing/**']);
    expect(props.onDisabledPluginPatternsChange).toHaveBeenCalledWith(['plugin/**']);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERN_STATE',
      payload: { source: 'custom', pattern: 'existing/**', enabled: false },
    });
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERN_STATE',
      payload: { source: 'plugin', pattern: 'plugin/**', enabled: false },
    });
  });

  it('counts disabled rows as not enabled', () => {
    renderPopover({ disabledPluginPatterns: ['plugin/**'] });

    expect(screen.getAllByText('Filters 1')[0]).toBeInTheDocument();
    expect(screen.getByText('1 enabled')).toBeInTheDocument();
  });
});
