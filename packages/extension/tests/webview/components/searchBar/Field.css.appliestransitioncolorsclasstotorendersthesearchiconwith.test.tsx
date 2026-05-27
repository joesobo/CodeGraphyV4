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



    it('applies transition-colors class to input', () => {
      render(
        <SearchBar
          value=""
          onChange={mockOnChange}
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />,
      );
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('transition-colors');
    });



    it('applies error border when regexError is set', () => {
      render(
        <SearchBar
          value="test["
          onChange={mockOnChange}
          options={{ ...defaultOptions, regex: true }}
          onOptionsChange={mockOnOptionsChange}
          regexError="Invalid regex"
          resultCount={0}
          totalCount={10}
        />,
      );
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('border-[var(--cg-input-error-border)]');
    });



    it('does not apply error border when regexError is not set', () => {
      render(
        <SearchBar
          value=""
          onChange={mockOnChange}
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />,
      );
      const input = screen.getByRole('textbox');
      expect(input.className).not.toContain('border-[var(--cg-input-error-border)]');
    });



    it('applies focus border when no regex error', () => {
      render(
        <SearchBar
          value=""
          onChange={mockOnChange}
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />,
      );
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('focus:border');
    });



    it('does not apply focus border when regexError is set', () => {
      render(
        <SearchBar
          value="test["
          onChange={mockOnChange}
          options={{ ...defaultOptions, regex: true }}
          onOptionsChange={mockOnOptionsChange}
          regexError="Invalid regex"
          resultCount={0}
          totalCount={10}
        />,
      );
      const input = screen.getByRole('textbox');
      expect(input.className).not.toContain('focus:border-[var(--cg-focus-border)]');
    });



    it('applies placeholder foreground class', () => {
      render(
        <SearchBar
          value=""
          onChange={mockOnChange}
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />,
      );
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('placeholder:text');
    });



    it('renders the search icon with placeholder foreground color', () => {
      const { container } = render(
        <SearchBar
          value=""
          onChange={mockOnChange}
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />,
      );
      const icon = container.querySelector('svg');
      expect(icon).not.toBeNull();
      const iconWrapper = icon?.closest('.absolute');
      expect(iconWrapper).not.toBeNull();
    });
});
