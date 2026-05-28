import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomeView } from './view';

describe('CodeGraphy website home page', () => {
  it('starts from the selected light website direction without design-lab chrome', () => {
    render(<HomeView />);

    expect(screen.getByRole('heading', { level: 1, name: 'See your code connect.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Play with the graph.' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Center' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Repel' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Distance' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Link force' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Node size' })).toBeInTheDocument();
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
    expect(screen.getByText('Example graphs')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Features.' })).toBeInTheDocument();
    expect(screen.getByText('Quickstart')).toBeInTheDocument();
    expect(screen.getByText('Starting path')).toBeInTheDocument();
    expect(screen.getByText('@codegraphy-dev/plugin-typescript')).toBeInTheDocument();
    expect(screen.getByText('Is CodeGraphy open source?')).toBeInTheDocument();
    expect(screen.getByText('Where do I report bugs or contribute?')).toBeInTheDocument();
    expect(screen.queryByText('GitHub repo')).not.toBeInTheDocument();
    expect(screen.queryByText('Nearby nodes naturally become the places you are already working.')).not.toBeInTheDocument();
    expect(screen.queryByText('Scan your codebase to create a local map of relationships.')).not.toBeInTheDocument();
    expect(screen.queryByText('$5/mo')).not.toBeInTheDocument();
    expect(screen.queryByText('Do I need an account?')).not.toBeInTheDocument();
    expect(screen.queryByText('How do I use CodeGraphy?')).not.toBeInTheDocument();
    expect(screen.queryByText('PROTOTYPE')).not.toBeInTheDocument();
  });
});
