import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PatternRow } from '../../../../../src/webview/components/searchBar/filters/popover/patternRow';

describe('searchBar/filters/popover/patternRow', () => {
  it('renders editable custom patterns with delete and disabled styling', () => {
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    const onEnabledChange = vi.fn();

    const { container } = render(
      <PatternRow
        enabled={false}
        onDelete={onDelete}
        onEdit={onEdit}
        onEnabledChange={onEnabledChange}
        pattern="custom/**"
        source="custom"
      />,
    );

    const row = container.querySelector('li');
    expect(row?.className).toContain('opacity-60');
    expect(row?.className).toContain('flex items-center gap-2');
    expect(screen.getByLabelText('Enable custom filter custom/**')).toHaveAttribute(
      'id',
      'filter-pattern-custom-custom/**',
    );
    const input = screen.getByLabelText('Edit filter pattern custom/**');
    expect(input).not.toHaveAttribute('readonly');
    expect(input.className).toContain('h-7 min-w-0 flex-1');
    expect(input.className).not.toContain('cursor-default');

    fireEvent.change(screen.getByDisplayValue('custom/**'), { target: { value: 'src/**' } });
    fireEvent.keyDown(screen.getByDisplayValue('src/**'), { key: 'Escape' });
    expect(onEdit).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByDisplayValue('src/**'), { key: 'Enter' });
    expect(onEdit).toHaveBeenCalledWith('src/**');
    onEdit.mockClear();
    fireEvent.change(screen.getByDisplayValue('src/**'), { target: { value: 'blur/**' } });
    fireEvent.blur(screen.getByDisplayValue('blur/**'));
    expect(onEdit).toHaveBeenCalledWith('blur/**');

    fireEvent.click(screen.getByTitle('Delete pattern'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('renders read-only plugin patterns without delete controls', () => {
    const onEnabledChange = vi.fn();

    const { container } = render(
      <PatternRow
        enabled
        onEnabledChange={onEnabledChange}
        pattern="plugin/**"
        source="plugin"
      />,
    );

    expect(container.querySelector('li')?.className).not.toContain('opacity-60');
    expect(screen.getByLabelText('Disable plugin filter plugin/**')).toHaveAttribute(
      'id',
      'filter-pattern-plugin-plugin/**',
    );
    const input = screen.getByLabelText('Plugin filter pattern plugin/**');
    expect(input).toHaveAttribute('readonly');
    expect(input.className).toContain('cursor-default');
    expect(screen.queryByTitle('Delete pattern')).not.toBeInTheDocument();

    expect(() => fireEvent.blur(screen.getByDisplayValue('plugin/**'))).not.toThrow();
  });
});
