import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LegendRuleRow } from '../../../src/webview/components/legends/ruleRow';

vi.mock('../../../src/webview/components/legends/colorInput', () => ({
  LegendColorInput: ({
    ariaLabel,
    color,
    onCommit,
  }: {
    ariaLabel: string;
    color: string;
    onCommit: (color: string) => void;
  }) => (
    <button aria-label={ariaLabel} data-color={color} onClick={() => onCommit('#654321')} type="button">
      color
    </button>
  ),
}));

const baseHandlers = () => ({
  onDragStart: vi.fn(),
  onDragOver: vi.fn(),
  onDrop: vi.fn(),
  onDragEnd: vi.fn(),
  onChange: vi.fn(),
  onRemove: vi.fn(),
  onToggleDefaultVisibility: vi.fn(),
});

describe('webview/components/legends/ruleRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders editable custom rules and routes edits through onChange/onRemove', () => {
    const handlers = baseHandlers();
    render(
      <LegendRuleRow
        rule={{ id: 'legend:custom', pattern: 'src/**', color: '#123456', target: 'node' }}
        index={0}
        isDragging={true}
        isDragOver={true}
        {...handlers}
      />,
    );

    fireEvent.change(screen.getByLabelText('Legend pattern 1'), { target: { value: 'tests/**' } });
    fireEvent.click(screen.getByLabelText('Legend color 1'));
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByTitle('Delete legend rule'));

    expect(handlers.onChange).toHaveBeenNthCalledWith(1, {
      id: 'legend:custom',
      pattern: 'tests/**',
      color: '#123456',
      target: 'node',
    });
    expect(handlers.onChange).toHaveBeenNthCalledWith(2, {
      id: 'legend:custom',
      pattern: 'src/**',
      color: '#654321',
      target: 'node',
    });
    expect(handlers.onChange).toHaveBeenNthCalledWith(3, {
      id: 'legend:custom',
      pattern: 'src/**',
      color: '#123456',
      target: 'node',
      disabled: true,
    });
    expect(handlers.onRemove).toHaveBeenCalledOnce();
    expect(screen.getByTestId('legend-rule-row').className).toBe(
      'transition-colors bg-accent/30 opacity-60',
    );
  });

  it('renders plugin defaults as read-only and toggles visibility through the default handler', () => {
    const handlers = baseHandlers();
    const { container } = render(
      <LegendRuleRow
        rule={{
          id: 'legend:default',
          pattern: '*.ts',
          color: '#abcdef',
          target: 'node',
          isPluginDefault: true,
          disabled: true,
        }}
        index={1}
        isDragging={false}
        isDragOver={false}
        {...handlers}
      />,
    );

    expect(screen.queryByLabelText('Legend pattern 2')).toBeNull();
    expect(screen.queryByLabelText('Legend color 2')).toBeNull();
    expect(screen.queryByTitle('Delete legend rule')).toBeNull();
    expect(screen.getByTitle('*.ts')).toHaveTextContent('*.ts');
    expect(screen.getByTestId('legend-rule-row').className).toBe('transition-colors');
    expect(container.querySelector('span[aria-hidden="true"]')).toHaveStyle({ backgroundColor: '#abcdef' });
    fireEvent.click(screen.getByRole('switch'));

    expect(handlers.onToggleDefaultVisibility).toHaveBeenCalledWith('legend:default', true);
    expect(handlers.onChange).not.toHaveBeenCalled();
  });
});
