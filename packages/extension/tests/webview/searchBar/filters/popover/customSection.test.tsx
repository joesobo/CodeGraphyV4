import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomFiltersSection } from '../../../../../src/webview/components/searchBar/filters/popover/customSection';

function renderCustomSection(overrides: Partial<React.ComponentProps<typeof CustomFiltersSection>> = {}) {
  const props: React.ComponentProps<typeof CustomFiltersSection> = {
    canAdd: true,
    customPatterns: ['custom/**'],
    disabledCustom: new Set(),
    draftPattern: 'pending/**',
    draftPendingPatterns: [],
    enabled: true,
    onAddPattern: vi.fn(),
    onCustomPatternToggle: vi.fn(),
    onPatternsChange: vi.fn(),
    onSectionToggle: vi.fn(),
    setDraftPattern: vi.fn(),
    setDraftPendingPatterns: vi.fn(),
    ...overrides,
  };

  render(<CustomFiltersSection {...props} />);
  return props;
}

describe('searchBar/filters/popover/customSection', () => {
  it('commits draft text only from Enter and shows pending multi-add copy', () => {
    const props = renderCustomSection({
      draftPendingPatterns: ['one/**', 'two/**'],
    });

    expect(screen.getByText('Adds 2 selected globs.')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByPlaceholderText('**/src/app.ts'), { key: 'Escape' });
    expect(props.onAddPattern).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByPlaceholderText('**/src/app.ts'), { key: 'Enter' });
    expect(props.onAddPattern).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByPlaceholderText('**/src/app.ts'), { target: { value: 'typed/**' } });
    expect(props.setDraftPattern).toHaveBeenCalledWith('typed/**');
    expect(props.setDraftPendingPatterns).toHaveBeenCalledWith([]);
  });

  it('shows an empty list state and disables add when no custom patterns are addable', () => {
    renderCustomSection({
      canAdd: false,
      customPatterns: [],
      draftPattern: '',
      draftPendingPatterns: ['one/**'],
    });

    expect(screen.getByText('No filters.')).toBeInTheDocument();
    expect(screen.queryByText('Adds 1 selected globs.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });
});
