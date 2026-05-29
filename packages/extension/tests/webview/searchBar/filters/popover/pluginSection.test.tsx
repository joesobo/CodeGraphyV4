import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PluginFiltersSection } from '../../../../../src/webview/components/searchBar/filters/popover/pluginSection';

function renderPluginSection(overrides: Partial<React.ComponentProps<typeof PluginFiltersSection>> = {}) {
  const props: React.ComponentProps<typeof PluginFiltersSection> = {
    disabledPlugin: new Set(),
    enabled: true,
    onPluginGroupToggle: vi.fn(),
    onPluginPatternToggle: vi.fn(),
    onSectionToggle: vi.fn(),
    pluginPatterns: ['plugin/**'],
    visiblePluginGroups: [{ pluginId: 'plugin.one', pluginName: 'Plugin One', patterns: ['plugin/**'] }],
    ...overrides,
  };

  render(<PluginFiltersSection {...props} />);
  return props;
}

describe('searchBar/filters/popover/pluginSection', () => {
  it('expands and collapses plugin filter groups', () => {
    renderPluginSection();

    fireEvent.click(screen.getByRole('button', { name: 'Expand Plugin One plugin filters' }));
    expect(screen.getByDisplayValue('plugin/**')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Collapse Plugin One plugin filters' }));
    expect(screen.queryByDisplayValue('plugin/**')).not.toBeInTheDocument();
  });

  it('shows the empty plugin pattern state', () => {
    renderPluginSection({
      pluginPatterns: [],
      visiblePluginGroups: [],
    });

    expect(screen.getByText('No filters.')).toBeInTheDocument();
  });
});
