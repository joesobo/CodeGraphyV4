import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Patterns } from '../../../../src/webview/components/settingsPanel/filters/Patterns';

describe('Patterns', () => {
  it('renders plugin defaults and custom patterns', () => {
    render(
      <Patterns
        filterPatterns={['**/*.tmp']}
        newFilterPattern=""
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onPatternChange={vi.fn()}
        pluginFilterPatterns={['**/*.uid']}
      />,
    );

    expect(screen.getByText('Plugin defaults (read-only)')).toBeInTheDocument();
    expect(screen.getByText('**/*.uid')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit filter pattern **/*.tmp')).toHaveValue('**/*.tmp');
  });

  it('renders the empty state and keeps the add button disabled for whitespace-only input', () => {
    render(
      <Patterns
        filterPatterns={[]}
        newFilterPattern="   "
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onPatternChange={vi.fn()}
        pluginFilterPatterns={[]}
      />,
    );

    expect(screen.getByText('No patterns.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Add$/i })).toBeDisabled();
  });

  it('forwards add, delete, change, and enter-key events', () => {
    const onAdd = vi.fn();
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    const onPatternChange = vi.fn();

    render(
      <Patterns
        filterPatterns={['**/*.tmp']}
        newFilterPattern="**/*.cache"
        onAdd={onAdd}
        onDelete={onDelete}
        onEdit={onEdit}
        onPatternChange={onPatternChange}
        pluginFilterPatterns={[]}
      />,
    );

    const input = screen.getByPlaceholderText('*.png');
    fireEvent.change(input, { target: { value: '**/*.log' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    fireEvent.click(screen.getByTitle('Delete pattern'));

    expect(onPatternChange).toHaveBeenCalledWith('**/*.log');
    expect(onAdd).toHaveBeenCalledTimes(2);
    expect(onDelete).toHaveBeenCalledWith('**/*.tmp');
  });

  it('allows custom patterns to be edited inline', () => {
    const onEdit = vi.fn();

    render(
      <Patterns
        filterPatterns={['**/*.tmp']}
        newFilterPattern=""
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
        onPatternChange={vi.fn()}
        pluginFilterPatterns={[]}
      />,
    );

    const input = screen.getByLabelText('Edit filter pattern **/*.tmp');
    fireEvent.change(input, { target: { value: '**/*.cache' } });
    fireEvent.blur(input);

    expect(onEdit).toHaveBeenCalledWith('**/*.tmp', '**/*.cache');
  });
});
