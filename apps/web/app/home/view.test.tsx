import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomeView } from './view';

describe('CodeGraphy website home page', () => {
  it('starts from the selected light website direction without design-lab chrome', () => {
    render(<HomeView />);

    expect(screen.getByRole('heading', { level: 1, name: 'See how everything connects.' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Install CodeGraphy/i })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: 'https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy',
        }),
      ]),
    );
    expect(screen.getAllByRole('link', { name: /GitHub/i })[0]).toHaveAttribute(
      'href',
      'https://github.com/joesobo/CodeGraphyV4',
    );
    expect(screen.getByRole('link', { name: 'MCP package' })).toHaveAttribute(
      'href',
      'https://www.npmjs.com/package/@codegraphy-dev/mcp',
    );
    expect(screen.getByText('Relationship Graph with file, folder, package, symbol, and plugin nodes')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /CodeGraphy architecture diagram/i })).toBeInTheDocument();
    expect(screen.queryByText('Do I need an account?')).not.toBeInTheDocument();
    expect(screen.queryByText('PROTOTYPE')).not.toBeInTheDocument();
  });
});
