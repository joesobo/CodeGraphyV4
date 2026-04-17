import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LegendRuleCreateRow } from '../../../../src/webview/components/legends/panel/section/createRow';

vi.mock('../../../../src/webview/components/legends/panel/section/colorInput', () => ({
  LegendColorInput: ({
    ariaLabel,
    color,
    onCommit,
  }: {
    ariaLabel: string;
    color: string;
    onCommit: (color: string) => void;
  }) => (
    <input
      aria-label={ariaLabel}
      value={color}
      onChange={(event) => onCommit(event.target.value)}
    />
  ),
}));

vi.mock('../../../../src/webview/components/legends/panel/messages', () => ({
  createLegendRuleId: vi.fn(() => 'legend:new'),
}));

describe('webview/legends/createRow', () => {
  it('adds a trimmed rule with the selected color and resets the form', () => {
    const onAdd = vi.fn();

    render(<LegendRuleCreateRow target="node" onAdd={onAdd} />);

    expect(screen.getByLabelText('New node legend pattern')).toHaveValue('');
    expect(screen.getByLabelText('New node legend color')).toHaveValue('#3B82F6');

    fireEvent.change(screen.getByLabelText('New node legend pattern'), {
      target: { value: '  */tests/**  ' },
    });
    fireEvent.change(screen.getByLabelText('New node legend color'), {
      target: { value: '#123abc' },
    });
    fireEvent.click(screen.getByTitle('Add node legend'));

    expect(onAdd).toHaveBeenCalledWith({
      id: 'legend:new',
      pattern: '*/tests/**',
      color: '#123abc',
      target: 'node',
    });
    expect(screen.getByLabelText('New node legend pattern')).toHaveValue('');
    expect(screen.getByLabelText('New node legend color')).toHaveValue('#3B82F6');
  });

  it('ignores blank patterns without resetting the selected color', () => {
    const onAdd = vi.fn();

    render(<LegendRuleCreateRow target="edge" onAdd={onAdd} />);

    expect(screen.getByLabelText('New edge legend pattern')).toHaveValue('');
    expect(screen.getByLabelText('New edge legend color')).toHaveValue('#3B82F6');

    fireEvent.change(screen.getByLabelText('New edge legend pattern'), {
      target: { value: '   ' },
    });
    fireEvent.change(screen.getByLabelText('New edge legend color'), {
      target: { value: '#fedcba' },
    });
    fireEvent.click(screen.getByTitle('Add edge legend'));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByLabelText('New edge legend pattern')).toHaveValue('   ');
    expect(screen.getByLabelText('New edge legend color')).toHaveValue('#fedcba');
  });
});
