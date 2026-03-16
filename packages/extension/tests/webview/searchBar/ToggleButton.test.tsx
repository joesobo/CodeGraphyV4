import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToggleButton } from '../../../src/webview/components/searchBar/ToggleButton';

describe('ToggleButton', () => {
  it('renders with the combined title and shortcut', () => {
    render(
      <ToggleButton active={false} onClick={vi.fn()} title="Match Case" shortcut="Alt+C">
        Aa
      </ToggleButton>
    );
    expect(screen.getByTitle('Match Case (Alt+C)')).toBeInTheDocument();
  });

  it('renders children text', () => {
    render(
      <ToggleButton active={false} onClick={vi.fn()} title="Regex" shortcut="Alt+R">
        .*
      </ToggleButton>
    );
    expect(screen.getByText('.*')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(
      <ToggleButton active={false} onClick={onClick} title="Match Case" shortcut="Alt+C">
        Aa
      </ToggleButton>
    );
    fireEvent.click(screen.getByTitle('Match Case (Alt+C)'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies active styles when active is true and no error', () => {
    render(
      <ToggleButton active={true} onClick={vi.fn()} title="Match Case" shortcut="Alt+C">
        Aa
      </ToggleButton>
    );
    const button = screen.getByTitle('Match Case (Alt+C)');
    expect(button.className).toContain('bg-[var(--vscode-inputOption-activeBackground');
  });

  it('applies error styles when hasError is true', () => {
    render(
      <ToggleButton active={true} onClick={vi.fn()} title="Regex" shortcut="Alt+R" hasError={true}>
        .*
      </ToggleButton>
    );
    const button = screen.getByTitle('Regex (Alt+R)');
    expect(button.className).toContain('bg-[var(--vscode-inputValidation-errorBackground');
  });

  it('applies inactive styles when active is false and no error', () => {
    render(
      <ToggleButton active={false} onClick={vi.fn()} title="Match Case" shortcut="Alt+C">
        Aa
      </ToggleButton>
    );
    const button = screen.getByTitle('Match Case (Alt+C)');
    expect(button.className).toContain('bg-transparent');
  });
});
