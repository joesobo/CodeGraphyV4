import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ColorField } from '../../../../src/webview/components/settingsPanel/display/ColorField';

describe('display ColorField', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the provided label and value', () => {
    render(
      <ColorField
        id="direction-color"
        label="Direction Color"
        onChange={vi.fn()}
        value="#abcdef"
      />
    );

    expect(screen.getByLabelText('Direction Color')).toHaveValue('#abcdef');
    expect(screen.getByText('#abcdef')).toBeInTheDocument();
  });

  it('forwards changed color values', () => {
    const onChange = vi.fn();
    render(
      <ColorField
        id="direction-color"
        label="Direction Color"
        onChange={onChange}
        value="#abcdef"
      />
    );

    fireEvent.change(screen.getByLabelText('Direction Color'), {
      target: { value: '#123456' },
    });

    expect(onChange).toHaveBeenCalledWith('#123456');
  });

  it('ignores invalid change handlers at runtime', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ColorField
        id="direction-color"
        label="Direction Color"
        onChange={undefined as unknown as (value: string) => void}
        value="#abcdef"
      />
    );

    expect(() =>
      fireEvent.change(screen.getByLabelText('Direction Color'), {
        target: { value: '#123456' },
      })
    ).not.toThrow();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
