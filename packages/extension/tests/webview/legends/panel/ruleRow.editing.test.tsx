import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/webview/components/legends/panel/section/colorInput', () => ({
  LegendColorInput: ({ ariaLabel, color, onCommit }: {
    ariaLabel: string;
    color: string;
    onCommit: (color: string) => void;
  }) => (
    <button aria-label={ariaLabel} data-color={color} onClick={() => onCommit('#654321')} type="button">
      color
    </button>
  ),
}));

import { LegendRuleRow } from '../../../../src/webview/components/legends/panel/section/ruleRow';
import { createRuleRowHandlers as baseHandlers } from './ruleRowFixture';

describe('legend rule row editing', () => {
  beforeEach(() => vi.clearAllMocks());
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
    fireEvent.blur(screen.getByLabelText('Legend pattern 1'));
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
      'transition-colors bg-[var(--cg-accent-strong)] opacity-60',
    );
    expect(screen.getByTitle('Drag legend rule')).toBeInTheDocument();
    expect(screen.getByTestId('legend-rule-row')).not.toHaveAttribute('draggable');
  });

  it('does not commit blank custom rule names', () => {
    const handlers = baseHandlers();
    render(
      <LegendRuleRow
        rule={{ id: 'legend:custom', pattern: 'src/**', color: '#123456', target: 'node' }}
        index={0}
        isDragging={false}
        isDragOver={false}
        {...handlers}
      />,
    );

    const input = screen.getByLabelText('Legend pattern 1');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.blur(input);

    expect(handlers.onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('src/**');
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
    expect(container.querySelector('span[aria-hidden="true"][style]')).toHaveStyle({
      backgroundColor: '#abcdef',
    });
    fireEvent.click(screen.getByRole('switch'));

    expect(handlers.onToggleDefaultVisibility).toHaveBeenCalledWith('legend:default', true);
    expect(handlers.onChange).not.toHaveBeenCalled();
  });

  it('shows plugin default icon and shape metadata in the rule row', () => {
    const handlers = baseHandlers();

    render(
      <LegendRuleRow
        rule={{
          id: 'legend:default',
          pattern: '*.ts',
          color: '#abcdef',
          target: 'node',
          imageUrl: 'webview://typescript.svg',
          shape2D: 'hexagon',
          isPluginDefault: true,
        }}
        index={1}
        isDragging={false}
        isDragOver={false}
        {...handlers}
      />,
    );

    expect(screen.getByAltText('*.ts icon')).toHaveAttribute('src', 'webview://typescript.svg');
    expect(screen.getByTitle('*.ts shape: hexagon')).toBeInTheDocument();
  });

  it('updates custom rule shape metadata from the shape dropdown', () => {
    const handlers = baseHandlers();

    render(
      <LegendRuleRow
        rule={{ id: 'legend:custom', pattern: 'src/**', color: '#123456', target: 'node' }}
        index={0}
        isDragging={false}
        isDragOver={false}
        {...handlers}
      />,
    );

    fireEvent.click(screen.getByTitle('Choose legend shape'));
    fireEvent.click(screen.getByTitle('Use hexagon shape'));

    expect(handlers.onChange).toHaveBeenCalledWith({
      id: 'legend:custom',
      pattern: 'src/**',
      color: '#123456',
      target: 'node',
      shape2D: 'hexagon',
    });
  });


  it('starts dragging only from the drag handle', () => {
    const handlers = baseHandlers();

    render(
      <LegendRuleRow
        rule={{ id: 'legend:custom', pattern: 'src/**', color: '#123456', target: 'node' }}
        index={0}
        isDragging={false}
        isDragOver={false}
        {...handlers}
      />,
    );

    fireEvent.dragStart(screen.getByTestId('legend-rule-row'));
    expect(handlers.onDragStart).not.toHaveBeenCalled();

    fireEvent.dragStart(screen.getByTitle('Drag legend rule'));
    expect(handlers.onDragStart).toHaveBeenCalledOnce();
});
});
