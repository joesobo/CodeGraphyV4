import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ToggleButton } from '../../../../src/webview/components/searchBar/ToggleButton';

describe('ToggleButton', () => {
  it('renders the children text', () => {
    render(
      <ToggleButton active={false} onClick={vi.fn()} title="Match Case" shortcut="Alt+C">
        Aa
      </ToggleButton>,
    );

    expect(screen.getByText('Aa')).toBeDefined();
  });

  it('includes the title and shortcut in the tooltip', () => {
    render(
      <ToggleButton active={false} onClick={vi.fn()} title="Match Case" shortcut="Alt+C">
        Aa
      </ToggleButton>,
    );

    const button = screen.getByTitle('Match Case (Alt+C)');
    expect(button).toBeDefined();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(
      <ToggleButton active={false} onClick={onClick} title="Match Case" shortcut="Alt+C">
        Aa
      </ToggleButton>,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies error styles when hasError is true', () => {
    render(
      <ToggleButton active={false} onClick={vi.fn()} title="Regex" shortcut="Alt+R" hasError>
        .*
      </ToggleButton>,
    );

    const button = screen.getByRole('button');
    expect(button.className).toContain('errorBackground');
  });
});
