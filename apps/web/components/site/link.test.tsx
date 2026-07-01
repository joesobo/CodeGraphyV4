import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SiteLink } from './link';

describe('SiteLink', () => {
  it('renders internal links without external link attributes', () => {
    render(<SiteLink href="/docs">Docs</SiteLink>);

    const link = screen.getByRole('link', { name: 'Docs' });

    expect(link.getAttribute('href')).toBe('/docs');
    expect(link.hasAttribute('target')).toBe(false);
    expect(link.hasAttribute('rel')).toBe(false);
  });

  it('renders external links with safe defaults', () => {
    render(<SiteLink href="https://github.com/joesobo/CodeGraphyV4">GitHub</SiteLink>);

    const link = screen.getByRole('link', { name: 'GitHub' });

    expect(link.getAttribute('href')).toBe('https://github.com/joesobo/CodeGraphyV4');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noreferrer');
  });
});
