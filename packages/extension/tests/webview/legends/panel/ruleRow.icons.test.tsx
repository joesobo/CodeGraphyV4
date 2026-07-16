import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

describe('legend rule row icons', () => {
  beforeEach(() => vi.clearAllMocks());
  it('imports uploaded custom rule icons through the icon popup', async () => {
    const handlers = baseHandlers();
    const file = new File(['<svg></svg>'], 'Type Script.svg', { type: 'image/svg+xml' });

    render(
      <LegendRuleRow
        rule={{ id: 'legend:custom', pattern: 'src/**', color: '#123456', target: 'node' }}
        index={0}
        isDragging={false}
        isDragOver={false}
        {...handlers}
      />,
    );

    fireEvent.click(screen.getByTitle('Upload legend icon'));
    expect(screen.queryByTitle('Clear legend icon')).toBeNull();
    fireEvent.change(screen.getByLabelText('Legend icon 1'), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(handlers.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'legend:custom',
          imagePath: '.codegraphy/icons/legend-custom-type-script.svg',
          imageUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
        }),
        [
          {
            imagePath: '.codegraphy/icons/legend-custom-type-script.svg',
            contentsBase64: 'PHN2Zz48L3N2Zz4=',
          },
        ],
      );
    });
  });

  it('ignores missing icon files from the upload input', () => {
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

    fireEvent.click(screen.getByTitle('Upload legend icon'));
    const input = screen.getByLabelText('Legend icon 1') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: undefined, configurable: true });

    expect(() => fireEvent.change(input)).not.toThrow();
    expect(() => fireEvent.change(input, { target: { files: [] } })).not.toThrow();
    expect(handlers.onChange).not.toHaveBeenCalled();
  });

  it('clears custom rule icon metadata from the icon popup', () => {
    const handlers = baseHandlers();

    render(
      <LegendRuleRow
        rule={{
          id: 'legend:custom',
          pattern: 'src/**',
          color: '#123456',
          target: 'node',
          imagePath: '.codegraphy/icons/custom.svg',
          imageUrl: 'webview://custom.svg',
        }}
        index={0}
        isDragging={false}
        isDragOver={false}
        {...handlers}
      />,
    );

    fireEvent.click(screen.getByTitle('Upload legend icon'));
    fireEvent.click(screen.getByTitle('Clear legend icon'));

    expect(handlers.onChange).toHaveBeenCalledWith({
      id: 'legend:custom',
      pattern: 'src/**',
      color: '#123456',
      target: 'node',
    });
  });

  it('clears persisted icon metadata even when only the image path is present', () => {
    const handlers = baseHandlers();

    render(
      <LegendRuleRow
        rule={{
          id: 'legend:custom',
          pattern: 'src/**',
          color: '#123456',
          target: 'node',
          imagePath: '.codegraphy/icons/custom.svg',
        }}
        index={0}
        isDragging={false}
        isDragOver={false}
        {...handlers}
      />,
    );

    fireEvent.click(screen.getByTitle('Upload legend icon'));
    fireEvent.click(screen.getByTitle('Clear legend icon'));

    expect(handlers.onChange).toHaveBeenCalledWith({
      id: 'legend:custom',
      pattern: 'src/**',
      color: '#123456',
      target: 'node',
    });
  });

});
