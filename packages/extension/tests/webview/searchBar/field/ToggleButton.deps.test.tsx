/**
 * Tests targeting surviving mutants in ToggleButton.tsx:
 * - L34:9 StringLiteral: "" ('px-1.5 py-0.5 text-xs font-medium rounded transition-colors')
 * - L35:9 StringLiteral: "" ('border')
 * - L36:9 ConditionalExpression: true (active && !hasError -> true)
 * - L36:9 LogicalOperator: active || !hasError (active && !hasError -> active || !hasError)
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToggleButton } from '../../../../src/webview/components/searchBar/ToggleButton';

/**
 * Helper: checks if a className string contains a standalone class (not just as a prefix).
 * e.g., hasClass('border foo', 'border') => true
 * e.g., hasClass('border-transparent foo', 'border') => false
 */
function hasStandaloneClass(className: string, cls: string): boolean {
  return className.split(/\s+/).includes(cls);
}

describe('ToggleButton (base class mutations)', () => {
  it('always has text-xs class regardless of active state', () => {
    // L34: if the base class string is mutated to "", these classes disappear
    render(
      <ToggleButton active={false} onClick={vi.fn()} title="Test" shortcut="Alt+T">
        T
      </ToggleButton>,
    );
    const button = screen.getByRole('button');
    expect(button.className).toContain('text-xs');
  });

  it('always has rounded class regardless of active state', () => {
    render(
      <ToggleButton active={true} onClick={vi.fn()} title="Test" shortcut="Alt+T">
        T
      </ToggleButton>,
    );
    const button = screen.getByRole('button');
    expect(button.className).toContain('rounded');
  });

  it('always has font-medium class', () => {
    render(
      <ToggleButton active={false} onClick={vi.fn()} title="Test" shortcut="Alt+T">
        T
      </ToggleButton>,
    );
    const button = screen.getByRole('button');
    expect(button.className).toContain('font-medium');
  });

  it('always has the standalone border class when inactive and no error', () => {
    // L35: if 'border' string is mutated to "", the standalone border class is missing
    // (but border-transparent would remain, so we must check for standalone 'border')
    render(
      <ToggleButton active={false} onClick={vi.fn()} title="Test" shortcut="Alt+T">
        T
      </ToggleButton>,
    );
    const button = screen.getByRole('button');
    expect(hasStandaloneClass(button.className, 'border')).toBe(true);
  });

  it('has standalone border class when active', () => {
    render(
      <ToggleButton active={true} onClick={vi.fn()} title="Test" shortcut="Alt+T">
        T
      </ToggleButton>,
    );
    const button = screen.getByRole('button');
    expect(hasStandaloneClass(button.className, 'border')).toBe(true);
  });

  it('has standalone border class when hasError', () => {
    render(
      <ToggleButton active={false} onClick={vi.fn()} title="Test" shortcut="Alt+T" hasError>
        T
      </ToggleButton>,
    );
    const button = screen.getByRole('button');
    expect(hasStandaloneClass(button.className, 'border')).toBe(true);
  });
});

describe('ToggleButton (conditional expression mutations)', () => {
  it('does not apply active background when inactive and no error', () => {
    // L36: if `active && !hasError` is mutated to `true`, inactive button
    // would incorrectly get active styling
    render(
      <ToggleButton active={false} onClick={vi.fn()} title="Test" shortcut="Alt+T">
        T
      </ToggleButton>,
    );
    const button = screen.getByRole('button');
    expect(button.className).not.toContain('inputOption-activeBackground');
    expect(button.className).toContain('bg-transparent');
  });

  it('does not apply active background when hasError is true even if active', () => {
    // L36: if `active && !hasError` is mutated to `active || !hasError`,
    // active+hasError would incorrectly get active styling
    render(
      <ToggleButton active={true} onClick={vi.fn()} title="Test" shortcut="Alt+T" hasError>
        T
      </ToggleButton>,
    );
    const button = screen.getByRole('button');
    expect(button.className).not.toContain('inputOption-activeBackground');
    expect(button.className).toContain('errorBackground');
  });

  it('applies active background only when active is true and hasError is false', () => {
    render(
      <ToggleButton active={true} onClick={vi.fn()} title="Test" shortcut="Alt+T" hasError={false}>
        T
      </ToggleButton>,
    );
    const button = screen.getByRole('button');
    expect(button.className).toContain('inputOption-activeBackground');
    expect(button.className).not.toContain('bg-transparent');
    expect(button.className).not.toContain('errorBackground');
  });
});
