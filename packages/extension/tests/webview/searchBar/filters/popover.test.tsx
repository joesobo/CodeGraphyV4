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
    pluginGroups: [{ pluginId: 'plugin.one', pluginName: 'Plugin One', patterns: ['plugin/**'] }],
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

  it('bulk toggles custom and plugin sections', () => {
    const props = renderPopover({
      customPatterns: ['one/**', 'two/**'],
      disabledCustomPatterns: ['two/**'],
      disabledPluginPatterns: [],
      pluginGroups: [
        { pluginId: 'plugin.one', pluginName: 'Plugin One', patterns: ['plugin-one/**'] },
        { pluginId: 'plugin.two', pluginName: 'Plugin Two', patterns: ['plugin-two/**'] },
      ],
      pluginPatterns: ['plugin-one/**', 'plugin-two/**'],
    });

    fireEvent.click(screen.getByLabelText('Disable all custom filters'));
    fireEvent.click(screen.getByLabelText('Disable all plugin filters'));

    expect(props.onDisabledCustomPatternsChange).toHaveBeenCalledWith(['one/**', 'two/**']);
    expect(props.onDisabledPluginPatternsChange).toHaveBeenCalledWith(['plugin-one/**', 'plugin-two/**']);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERN_GROUP_STATE',
      payload: { source: 'custom', enabled: false },
    });
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERN_GROUP_STATE',
      payload: { source: 'plugin', enabled: false },
    });
  });

  it('groups plugin default filters by plugin', () => {
    renderPopover({
      pluginGroups: [
        { pluginId: 'plugin.one', pluginName: 'Plugin One', patterns: ['plugin-one/**'] },
        { pluginId: 'plugin.two', pluginName: 'Plugin Two', patterns: ['plugin-two/**'] },
      ],
      pluginPatterns: ['plugin-one/**', 'plugin-two/**'],
    });

    expect(screen.getByText('Plugin One')).toBeInTheDocument();
    expect(screen.getByDisplayValue('plugin-one/**')).toBeInTheDocument();
    expect(screen.getByText('Plugin Two')).toBeInTheDocument();
    expect(screen.getByDisplayValue('plugin-two/**')).toBeInTheDocument();
  });

  it('counts disabled rows as not enabled', () => {
    renderPopover({ disabledPluginPatterns: ['plugin/**'] });

    expect(screen.getAllByText('Filters 1')[0]).toBeInTheDocument();
    expect(screen.getByText('1 enabled')).toBeInTheDocument();
  });

  it('edits and deletes custom filter rows', () => {
    const props = renderPopover({ customPatterns: ['existing/**', 'temp/**'] });

    fireEvent.change(screen.getByDisplayValue('existing/**'), {
      target: { value: 'src/**' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('src/**'), { key: 'Enter' });

    expect(props.onPatternsChange).toHaveBeenCalledWith(['src/**', 'temp/**']);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERNS',
      payload: { patterns: ['src/**', 'temp/**'] },
    });

    fireEvent.click(screen.getAllByTitle('Delete pattern')[1] as HTMLElement);

    expect(props.onPatternsChange).toHaveBeenCalledWith(['existing/**']);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERNS',
      payload: { patterns: ['existing/**'] },
    });
  });

  it('falls back to a generic plugin-defaults group and ignores blank adds', () => {
    const props = renderPopover({
      customPatterns: [],
      pluginGroups: [],
      pluginPatterns: ['plugin/**'],
    });

    expect(screen.getAllByText('Plugin defaults')).toHaveLength(2);
    expect(screen.getByDisplayValue('plugin/**')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('**/src/app.ts'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(props.onPatternsChange).not.toHaveBeenCalled();
    expect(sentMessages).toEqual([]);
  });
});
