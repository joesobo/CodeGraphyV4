import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RulePatternCell } from '../../../../src/webview/components/legends/panel/section/rulePattern';

describe('webview/components/legends/rulePattern', () => {
  it('commits changed custom patterns on Enter', () => {
    const onChange = vi.fn();
    render(
      <RulePatternCell
        rule={{ id: 'legend:custom', pattern: 'src/**', color: '#123456', target: 'node' }}
        index={0}
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText('Legend pattern 1');
    fireEvent.change(input, { target: { value: 'tests/**' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith({
      id: 'legend:custom',
      pattern: 'tests/**',
      color: '#123456',
      target: 'node',
    });
  });

  it('does not commit changed custom patterns on other keys', () => {
    const onChange = vi.fn();
    render(
      <RulePatternCell
        rule={{ id: 'legend:custom', pattern: 'src/**', color: '#123456', target: 'node' }}
        index={0}
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText('Legend pattern 1');
    fireEvent.change(input, { target: { value: 'tests/**' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not commit unchanged custom patterns on blur', () => {
    const onChange = vi.fn();
    render(
      <RulePatternCell
        rule={{ id: 'legend:custom', pattern: 'src/**', color: '#123456', target: 'node' }}
        index={0}
        onChange={onChange}
      />,
    );

    fireEvent.blur(screen.getByLabelText('Legend pattern 1'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('resets blank custom patterns to the current rule pattern', () => {
    const onChange = vi.fn();
    render(
      <RulePatternCell
        rule={{ id: 'legend:custom', pattern: 'src/**', color: '#123456', target: 'node' }}
        index={0}
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText('Legend pattern 1');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('src/**');
  });

  it('syncs draft text when the rule pattern changes', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <RulePatternCell
        rule={{ id: 'legend:custom', pattern: 'src/**', color: '#123456', target: 'node' }}
        index={0}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Legend pattern 1'), {
      target: { value: 'draft/**' },
    });
    rerender(
      <RulePatternCell
        rule={{ id: 'legend:custom', pattern: 'lib/**', color: '#123456', target: 'node' }}
        index={0}
        onChange={onChange}
      />,
    );

    expect(screen.getByLabelText('Legend pattern 1')).toHaveValue('lib/**');
  });

  it('renders plugin default patterns as read-only text', () => {
    render(
      <RulePatternCell
        rule={{
          id: 'legend:default',
          pattern: '*.ts',
          color: '#123456',
          target: 'node',
          isPluginDefault: true,
        }}
        index={1}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('Legend pattern 2')).toBeNull();
    expect(screen.getByTitle('*.ts')).toHaveTextContent('*.ts');
  });

  it('renders plugin default display labels when provided', () => {
    render(
      <RulePatternCell
        rule={{
          id: 'default:folder',
          pattern: '**',
          displayLabel: 'Folder',
          color: '#123456',
          target: 'node',
          isPluginDefault: true,
        }}
        index={1}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('Legend pattern 2')).toBeNull();
    expect(screen.getByTitle('Folder')).toHaveTextContent('Folder');
  });
});
