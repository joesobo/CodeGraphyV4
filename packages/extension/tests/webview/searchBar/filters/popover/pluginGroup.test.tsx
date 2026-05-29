import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PluginFilterGroup } from '../../../../../src/webview/components/searchBar/filters/popover/pluginGroup';

function renderPluginGroup(overrides: Partial<React.ComponentProps<typeof PluginFilterGroup>> = {}) {
  const props: React.ComponentProps<typeof PluginFilterGroup> = {
    disabledPlugin: new Set(),
    expanded: false,
    group: { pluginId: 'plugin.one', pluginName: 'Plugin One', patterns: ['plugin/**'] },
    onExpandedChange: vi.fn(),
    onPluginGroupToggle: vi.fn(),
    onPluginPatternToggle: vi.fn(),
    ...overrides,
  };

  render(<PluginFilterGroup {...props} />);
  return props;
}

describe('searchBar/filters/popover/pluginGroup', () => {
  it('links the expand button to the plugin filter list', () => {
    renderPluginGroup({ expanded: true });

    const button = screen.getByRole('button', { name: 'Collapse Plugin One plugin filters' });
    expect(button).toHaveAttribute('aria-controls', 'plugin-filter-group-plugin.one');
    expect(screen.getByDisplayValue('plugin/**').closest('ul')).toHaveAttribute(
      'id',
      'plugin-filter-group-plugin.one',
    );
  });

  it('labels disabled plugin groups as enable actions', () => {
    const props = renderPluginGroup({ disabledPlugin: new Set(['plugin/**']) });

    fireEvent.click(screen.getByLabelText('Enable plugin Plugin One filters'));

    expect(props.onPluginGroupToggle).toHaveBeenCalledWith(props.group, true);
  });
});
