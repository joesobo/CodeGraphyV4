import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CssSnippetsSection } from '../../../../../src/webview/components/legends/panel/cssSnippets';

vi.mock('../../../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

describe('CssSnippetsSection', () => {
  it('renders the section when no snippets are configured', () => {
    render(
      <CssSnippetsSection
        collapsedEntries={{}}
        onCollapsedChange={vi.fn()}
        snippets={{}}
      />,
    );

    expect(screen.getByRole('button', { name: 'CSS Snippets' })).toBeInTheDocument();
  });
});
