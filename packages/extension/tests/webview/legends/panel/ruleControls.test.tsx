import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  RuleColorControl,
  RuleDeleteControl,
  RuleDragHandle,
  RuleVisibilitySwitch,
  RuleVisualControls,
} from '../../../../src/webview/components/legends/panel/section/ruleControls';

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
    <button aria-label={ariaLabel} data-color={color} onClick={() => onCommit('#654321')} type="button">
      color
    </button>
  ),
}));

describe('webview/components/legends/ruleControls', () => {
  it('renders the drag handle title', () => {
    render(<RuleDragHandle />);

    expect(screen.getByTitle('Drag legend rule')).toBeInTheDocument();
    expect(screen.getByTitle('Drag legend rule')).toHaveAttribute('draggable', 'true');
  });

  it('renders editable visual controls for custom node rules', () => {
    const onChange = vi.fn();
    render(
      <RuleVisualControls
        rule={{ id: 'legend:custom', pattern: 'src/**', color: '#123456', target: 'node' }}
        index={0}
        onChange={onChange}
      />,
    );

    expect(screen.getByTitle('Upload legend icon')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Choose legend shape'));
    fireEvent.click(screen.getByTitle('Use hexagon shape'));

    expect(onChange).toHaveBeenCalledWith({
      id: 'legend:custom',
      pattern: 'src/**',
      color: '#123456',
      target: 'node',
      shape2D: 'hexagon',
      shape3D: 'dodecahedron',
    });
  });

  it('renders read-only visual previews for plugin defaults', () => {
    render(
      <RuleVisualControls
        rule={{
          id: 'legend:default',
          pattern: '*.ts',
          color: '#123456',
          target: 'node',
          isPluginDefault: true,
          imageUrl: 'webview://typescript.svg',
          shape2D: 'hexagon',
          shape3D: 'dodecahedron',
        }}
        index={0}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByAltText('*.ts icon')).toHaveAttribute('src', 'webview://typescript.svg');
    expect(screen.getByTitle('*.ts shape: hexagon')).toBeInTheDocument();
    expect(screen.queryByTitle('Upload legend icon')).toBeNull();
    expect(screen.queryByTitle('Choose legend shape')).toBeNull();
  });

  it('renders no icon preview for plugin defaults without an icon', () => {
    render(
      <RuleVisualControls
        rule={{
          id: 'legend:default',
          pattern: '*.json',
          color: '#f9c74f',
          target: 'node',
          isPluginDefault: true,
        }}
        index={0}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByAltText('*.json icon')).toBeNull();
    expect(screen.queryByTitle('Upload legend icon')).toBeNull();
    expect(screen.queryByTitle('*.json shape: circle')).toBeInTheDocument();
  });

  it('commits custom rule colors through the color input', () => {
    const onChange = vi.fn();
    render(
      <RuleColorControl
        rule={{ id: 'legend:custom', pattern: 'src/**', color: '#123456', target: 'node' }}
        index={0}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText('Legend color 1'));

    expect(onChange).toHaveBeenCalledWith({
      id: 'legend:custom',
      pattern: 'src/**',
      color: '#654321',
      target: 'node',
    });
  });

  it('renders plugin default colors as a read-only indicator', () => {
    const { container } = render(
      <RuleColorControl
        rule={{
          id: 'legend:default',
          pattern: '*.ts',
          color: '#abcdef',
          target: 'node',
          isPluginDefault: true,
        }}
        index={0}
        onChange={vi.fn()}
      />,
    );

    expect(container.querySelector('span[aria-hidden="true"]')).toHaveStyle({
      backgroundColor: '#abcdef',
    });
  });

  it('uses the rule pattern in visibility toggle labels', () => {
    render(
      <RuleVisibilitySwitch
        rule={{ id: 'legend:custom', pattern: 'src/**', color: '#123456', target: 'node' }}
        onChange={vi.fn()}
        onToggleDefaultVisibility={vi.fn()}
      />,
    );

    expect(screen.getByTitle('Toggle src/** legend entry')).toHaveAttribute(
      'aria-label',
      'Toggle src/** legend entry',
    );
  });

  it('routes custom visibility changes through rule updates', () => {
    const onChange = vi.fn();
    render(
      <RuleVisibilitySwitch
        rule={{ id: 'legend:custom', pattern: 'src/**', color: '#123456', target: 'node' }}
        onChange={onChange}
        onToggleDefaultVisibility={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('switch'));

    expect(onChange).toHaveBeenCalledWith({
      id: 'legend:custom',
      pattern: 'src/**',
      color: '#123456',
      target: 'node',
      disabled: true,
    });
  });

  it('routes plugin default visibility changes through the default handler', () => {
    const onChange = vi.fn();
    const onToggleDefaultVisibility = vi.fn();
    render(
      <RuleVisibilitySwitch
        rule={{
          id: 'legend:default',
          pattern: '*.ts',
          color: '#123456',
          target: 'node',
          isPluginDefault: true,
          disabled: true,
        }}
        onChange={onChange}
        onToggleDefaultVisibility={onToggleDefaultVisibility}
      />,
    );

    fireEvent.click(screen.getByRole('switch'));

    expect(onToggleDefaultVisibility).toHaveBeenCalledWith('legend:default', true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('hides delete controls for plugin defaults', () => {
    render(
      <RuleDeleteControl
        rule={{
          id: 'legend:default',
          pattern: '*.ts',
          color: '#123456',
          target: 'node',
          isPluginDefault: true,
        }}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.queryByTitle('Delete legend rule')).toBeNull();
  });

  it('routes custom delete clicks through the remove handler', () => {
    const onRemove = vi.fn();
    render(
      <RuleDeleteControl
        rule={{ id: 'legend:custom', pattern: 'src/**', color: '#123456', target: 'node' }}
        onRemove={onRemove}
      />,
    );

    fireEvent.click(screen.getByTitle('Delete legend rule'));

    expect(onRemove).toHaveBeenCalledOnce();
  });
});
