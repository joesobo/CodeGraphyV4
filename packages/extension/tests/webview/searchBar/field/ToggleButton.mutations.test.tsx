import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToggleButton } from '../../../../src/webview/components/searchBar/ToggleButton';

describe('ToggleButton (mutation targets)', () => {
  it('renders with active styling when active is true and no error', () => {
    render(
      <ToggleButton active={true} onClick={vi.fn()} title="Match Case" shortcut="Alt+C">
        Aa
      </ToggleButton>,
    );
    const button = screen.getByRole('button');
    expect(button.className).toContain('inputOption-activeBackground');
  });

  it('renders with inactive styling when active is false and no error', () => {
    render(
      <ToggleButton active={false} onClick={vi.fn()} title="Match Case" shortcut="Alt+C">
        Aa
      </ToggleButton>,
    );
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-transparent');
    expect(button.className).toContain('border-transparent');
  });

  it('renders error styling when hasError is true regardless of active state', () => {
    render(
      <ToggleButton active={true} onClick={vi.fn()} title="Regex" shortcut="Alt+R" hasError={true}>
        .*
      </ToggleButton>,
    );
    const button = screen.getByRole('button');
    expect(button.className).toContain('errorBackground');
    expect(button.className).toContain('errorBorder');
  });

  it('does not apply active styling when hasError is true', () => {
    render(
      <ToggleButton active={true} onClick={vi.fn()} title="Regex" shortcut="Alt+R" hasError={true}>
        .*
      </ToggleButton>,
    );
    const button = screen.getByRole('button');
    expect(button.className).not.toContain('inputOption-activeBackground');
  });

  it('does not apply inactive styling when hasError is true', () => {
    render(
      <ToggleButton active={false} onClick={vi.fn()} title="Regex" shortcut="Alt+R" hasError={true}>
        .*
      </ToggleButton>,
    );
    const button = screen.getByRole('button');
    expect(button.className).not.toContain('bg-transparent');
  });

  it('calls onClick exactly once when button is clicked', () => {
    const onClick = vi.fn();
    render(
      <ToggleButton active={false} onClick={onClick} title="Test" shortcut="Alt+T">
        T
      </ToggleButton>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('composes title from title and shortcut props', () => {
    render(
      <ToggleButton active={false} onClick={vi.fn()} title="Match Whole Word" shortcut="Alt+W">
        Ab
      </ToggleButton>,
    );
    expect(screen.getByTitle('Match Whole Word (Alt+W)')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <ToggleButton active={false} onClick={vi.fn()} title="Test" shortcut="Alt+T">
        <span data-testid="child">Content</span>
      </ToggleButton>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
