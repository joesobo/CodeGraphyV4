/**
 * Tests targeting surviving CSS class StringLiteral mutations in SearchBar.tsx.
 * Covers class names on the outer container, inner container, input, and icon.
 */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchBar } from '../../../../src/webview/components/searchBar/Field';
import type { SearchOptions } from '../../../../src/webview/components/searchBar/field/model';

describe('SearchBar (CSS class mutations)', () => {

    const defaultOptions: SearchOptions = {
      matchCase: false,
      wholeWord: false,
      regex: false,
    };



    const mockOnChange = vi.fn();


    const mockOnOptionsChange = vi.fn();



    beforeEach(() => {
      vi.clearAllMocks();
    });



    afterEach(() => {
      vi.restoreAllMocks();
    });



    it('applies the themed container classes to the outer container', () => {
      const { container } = render(
        <SearchBar
          value=""
          onChange={mockOnChange}
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />,
      );
      const outer = container.firstElementChild as HTMLElement;
      expect(outer.className).toContain('relative');
      expect(outer.className).toContain('rounded-md');
      expect(outer.className).toContain('border-[var(--cg-border-subtle)]');
      expect(outer.className).toContain('bg-[var(--cg-popover-translucent)]');
      expect(outer.className).toContain('p-2');
    });



    it('applies wrapped row layout to the control row', () => {
      const { container } = render(
        <SearchBar
          value=""
          onChange={mockOnChange}
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />,
      );
      const row = container.firstElementChild?.firstElementChild as HTMLElement;
      expect(row.className).toContain('flex');
      expect(row.className).toContain('flex-wrap');
      expect(row.className).toContain('items-center');
      expect(row.className).toContain('gap-2');
    });



    it('applies flex-1 to the inner container', () => {
      const { container } = render(
        <SearchBar
          value=""
          onChange={mockOnChange}
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />,
      );
      const inner = container.querySelector('.flex-1') as HTMLElement;
      expect(inner).not.toBeNull();
      expect(inner.className).toContain('flex-1');
      expect(inner.className).toContain('items-center');
    });



    it('applies input styling classes to the text input', () => {
      render(
        <SearchBar
          value=""
          onChange={mockOnChange}
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />,
      );
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('w-full');
      expect(input.className).toContain('pl-10');
      expect(input.className).toContain('pr-32');
      expect(input.className).toContain('py-1.5');
      expect(input.className).toContain('rounded-md');
      expect(input.className).toContain('text-sm');
    });



    it('applies themed input background class', () => {
      render(
        <SearchBar
          value=""
          onChange={mockOnChange}
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />,
      );
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('bg-input');
    });



    it('applies themed input foreground class', () => {
      render(
        <SearchBar
          value=""
          onChange={mockOnChange}
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />,
      );
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('text-[var(--cg-input-foreground)]');
    });



    it('applies focus:outline-none class to input', () => {
      render(
        <SearchBar
          value=""
          onChange={mockOnChange}
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />,
      );
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('focus:outline-none');
    });
});
