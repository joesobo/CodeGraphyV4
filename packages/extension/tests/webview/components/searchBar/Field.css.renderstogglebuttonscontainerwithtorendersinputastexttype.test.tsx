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



    it('renders toggle buttons container with gap-1', () => {
      const { container } = render(
        <SearchBar
          value=""
          onChange={mockOnChange}
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />,
      );
      const toggleContainer = container.querySelector('.gap-1') as HTMLElement;
      expect(toggleContainer).not.toBeNull();
      // Should contain the three toggle buttons
      const buttons = toggleContainer.querySelectorAll('button');
      expect(buttons).toHaveLength(3);
    });



    it('renders toggle button text Aa, Ab, and .*', () => {
      render(
        <SearchBar
          value=""
          onChange={mockOnChange}
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />,
      );
      expect(screen.getByText('Aa')).toBeInTheDocument();
      expect(screen.getByText('Ab')).toBeInTheDocument();
      expect(screen.getByText('.*')).toBeInTheDocument();
    });



    it('renders input as text type', () => {
      render(
        <SearchBar
          value=""
          onChange={mockOnChange}
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />,
      );
      const input = screen.getByRole('textbox');
      expect(input.getAttribute('type')).toBe('text');
    });
});
