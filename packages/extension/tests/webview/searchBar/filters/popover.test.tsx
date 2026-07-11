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
    onRespectFilesExcludeChange: vi.fn(),
    open: true,
    pendingPatterns: [],
    pluginGroups: [{ pluginId: 'plugin.one', pluginName: 'Plugin One', patterns: ['plugin/**'] }],
    pluginPatterns: ['plugin/**'],
    respectFilesExclude: true,
    ...overrides,
  };

  const view = render(<FilterPopover {...props} />);
  return Object.assign(props, { container: view.container, rerender: view.rerender });
}

describe('searchBar/filters/popover', () => {
  beforeEach(() => {
    sentMessages.length = 0;
  });

  it('renders enabled source counts and excluded subtext', () => {
    renderPopover();

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('3 enabled')).toBeInTheDocument();
    expect(screen.getByText('4 excluded from graph')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Plugin defaults')).toBeInTheDocument();
    expect(screen.getByText('VS Code files.exclude')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filters, 4 excluded' }).className).toContain('bg-secondary');
  });

  it('persists the VS Code files.exclude source toggle', () => {
    const props = renderPopover();

    fireEvent.click(screen.getByLabelText('Disable VS Code files.exclude'));

    expect(props.onRespectFilesExcludeChange).toHaveBeenCalledWith(false);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_RESPECT_FILES_EXCLUDE',
      payload: { enabled: false },
    });
  });

  it('opens and closes from its own trigger when uncontrolled', () => {
    const props = renderPopover({ onOpenChange: vi.fn(), open: undefined });

    expect(screen.queryByText('Filters')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Filters, 4 excluded' }));
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(props.onOpenChange).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: 'Filters, 4 excluded' }));
    expect(screen.queryByText('Filters')).not.toBeInTheDocument();
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('opens uncontrolled without an open-change callback', () => {
    renderPopover({ onOpenChange: undefined, open: undefined });

    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Filters, 4 excluded' }))).not.toThrow();
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('uses the inactive button style and keeps add disabled when no filter is pending', () => {
    renderPopover({
      customPatterns: [],
      disabledCustomPatterns: [],
      disabledPluginPatterns: [],
      pendingPatterns: undefined,
      pluginGroups: [],
      pluginPatterns: [],
      respectFilesExclude: false,
      excludedCount: 0,
    });

    const trigger = screen.getByRole('button', { name: 'Filters, 0 excluded' });
    expect(trigger.className).toContain('border');
    expect(trigger.className).not.toContain('bg-secondary');
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
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
    fireEvent.click(screen.getByRole('button', { name: 'Expand Plugin One plugin filters' }));
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

  it('bulk re-enables custom and plugin sections', () => {
    const props = renderPopover({
      customPatterns: ['one/**', 'two/**'],
      disabledCustomPatterns: ['one/**', 'two/**'],
      disabledPluginPatterns: ['plugin-one/**', 'plugin-two/**'],
      pluginGroups: [
        { pluginId: 'plugin.one', pluginName: 'Plugin One', patterns: ['plugin-one/**'] },
        { pluginId: 'plugin.two', pluginName: 'Plugin Two', patterns: ['plugin-two/**'] },
      ],
      pluginPatterns: ['plugin-one/**', 'plugin-two/**'],
    });

    fireEvent.click(screen.getByLabelText('Enable all custom filters'));
    fireEvent.click(screen.getByLabelText('Enable all plugin filters'));

    expect(props.onDisabledCustomPatternsChange).toHaveBeenCalledWith([]);
    expect(props.onDisabledPluginPatternsChange).toHaveBeenCalledWith([]);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERN_GROUP_STATE',
      payload: { source: 'custom', enabled: true },
    });
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERN_GROUP_STATE',
      payload: { source: 'plugin', enabled: true },
    });
  });

  it('groups plugin default filters by plugin and expands entries on demand', () => {
    renderPopover({
      pluginGroups: [
        { pluginId: 'plugin.one', pluginName: 'Plugin One', patterns: ['plugin-one/**'] },
        { pluginId: 'plugin.two', pluginName: 'Plugin Two', patterns: ['plugin-two/**'] },
      ],
      pluginPatterns: ['plugin-one/**', 'plugin-two/**'],
    });

    expect(screen.getByText('Plugin One')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('plugin-one/**')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Plugin One plugin filters' }));
    expect(screen.getByDisplayValue('plugin-one/**')).toBeInTheDocument();
    expect(screen.getByText('Plugin Two')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('plugin-two/**')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Plugin Two plugin filters' }));
    expect(screen.getByDisplayValue('plugin-two/**')).toBeInTheDocument();
  });

  it('toggles one plugin group without changing sibling plugin filters', () => {
    const props = renderPopover({
      pluginGroups: [
        { pluginId: 'plugin.one', pluginName: 'Plugin One', patterns: ['plugin-one-a/**', 'plugin-one-b/**'] },
        { pluginId: 'plugin.two', pluginName: 'Plugin Two', patterns: ['plugin-two/**'] },
      ],
      pluginPatterns: ['plugin-one-a/**', 'plugin-one-b/**', 'plugin-two/**'],
    });

    fireEvent.click(screen.getByLabelText('Disable plugin Plugin One filters'));

    expect(props.onDisabledPluginPatternsChange).toHaveBeenCalledWith(['plugin-one-a/**', 'plugin-one-b/**']);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERN_STATE',
      payload: { source: 'plugin', pattern: 'plugin-one-a/**', enabled: false },
    });
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERN_STATE',
      payload: { source: 'plugin', pattern: 'plugin-one-b/**', enabled: false },
    });
    expect(sentMessages).not.toContainEqual({
      type: 'UPDATE_FILTER_PATTERN_STATE',
      payload: { source: 'plugin', pattern: 'plugin-two/**', enabled: false },
    });
  });

  it('keeps filter content in a single scrolling surface', () => {
    const { container } = renderPopover({
      pluginGroups: [
        { pluginId: 'plugin.one', pluginName: 'Plugin One', patterns: ['plugin-one/**'] },
        { pluginId: 'plugin.two', pluginName: 'Plugin Two', patterns: ['plugin-two/**'] },
      ],
      pluginPatterns: ['plugin-one/**', 'plugin-two/**'],
    });

    const surface = container.querySelector('[data-testid="filters-inline-surface"]') as HTMLElement;
    const scrollingDescendants = Array.from(surface.querySelectorAll('[class*="overflow-y-auto"]'));

    expect(scrollingDescendants).toHaveLength(1);
  });

  it('counts disabled rows as not enabled', () => {
    renderPopover({ disabledPluginPatterns: ['plugin/**'] });

    expect(screen.getByRole('button', { name: 'Filters, 4 excluded' })).toBeInTheDocument();
    expect(screen.getByText('2 enabled')).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: 'Expand Plugin defaults plugin filters' }));
    expect(screen.getByDisplayValue('plugin/**')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('**/src/app.ts'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(props.onPatternsChange).not.toHaveBeenCalled();
    expect(sentMessages).toEqual([]);
  });
});
