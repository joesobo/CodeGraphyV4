import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MaxFilesControl } from '../../../../src/webview/components/settingsPanel/filters/MaxFilesControl';

describe('MaxFilesControl', () => {
  it('renders the current max-files value and disables decrease at one', () => {
    render(
      <MaxFilesControl
        maxFiles={1}
        onBlur={vi.fn()}
        onChange={vi.fn()}
        onDecrease={vi.fn()}
        onIncrease={vi.fn()}
        onKeyDown={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    expect(screen.getByTitle('Decrease by 100')).toBeDisabled();
  });

  it('forwards button and input events', () => {
    const onBlur = vi.fn();
    const onChange = vi.fn();
    const onDecrease = vi.fn();
    const onIncrease = vi.fn();
    const onKeyDown = vi.fn();

    render(
      <MaxFilesControl
        maxFiles={500}
        onBlur={onBlur}
        onChange={onChange}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
        onKeyDown={onKeyDown}
      />,
    );

    const input = screen.getByDisplayValue('500');
    fireEvent.click(screen.getByTitle('Decrease by 100'));
    fireEvent.click(screen.getByTitle('Increase by 100'));
    fireEvent.change(input, { target: { value: '350' } });
    fireEvent.blur(input, { target: { value: '350' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onDecrease).toHaveBeenCalledOnce();
    expect(onIncrease).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('350');
    expect(onBlur).toHaveBeenCalledWith('350');
    expect(onKeyDown).toHaveBeenCalled();
  });
});
