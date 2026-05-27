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
    expect(screen.getByText('Example maps')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Open core. Private plugins when you need more.' })).toBeInTheDocument();
    expect(screen.getByText('Quickstart')).toBeInTheDocument();
    expect(screen.getByText('Is CodeGraphy open source?')).toBeInTheDocument();
    expect(screen.getByText('Do private plugins need sign in?')).toBeInTheDocument();
    expect(screen.queryByText('GitHub repo')).not.toBeInTheDocument();
    expect(screen.queryByText('$5/mo')).not.toBeInTheDocument();
    expect(screen.queryByText('Do I need an account?')).not.toBeInTheDocument();
    expect(screen.queryByText('How do I use CodeGraphy?')).not.toBeInTheDocument();
    expect(screen.queryByText('PROTOTYPE')).not.toBeInTheDocument();
  });
});
