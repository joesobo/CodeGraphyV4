import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MARKDOWN_PREVIEW_CHARACTER_LIMIT, MarkdownPreview } from './MarkdownPreview';

describe('MarkdownPreview', () => {
  beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('renders GFM without executing raw HTML or exposing inert navigation controls', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(
      <MarkdownPreview content={'# Guide\n\n- [x] Ready\n\n[CodeGraphy](https://codegraphy.dev)\n\n<script>window.bad = true</script>'} />,
    ));

    expect(host.querySelector('h1')?.textContent).toBe('Guide');
    expect(host.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
    expect(host.querySelector('script')).toBeNull();
    expect(host.textContent).not.toContain('window.bad');
    expect(host.querySelector('a')).toBeNull();
    expect(host.querySelector('.markdown-preview-link')?.textContent).toBe('CodeGraphy');

    await act(async () => root.unmount());
  });

  it('shows an honest limit state instead of rendering a pathological preview', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(
      <MarkdownPreview content={'a'.repeat(MARKDOWN_PREVIEW_CHARACTER_LIMIT + 1)} />,
    ));

    expect(host.querySelector('[role="status"]')?.textContent).toContain('over 100,000 characters');
    expect(host.querySelector('article')).toBeNull();
    await act(async () => root.unmount());
  });

  it('shows an honest placeholder for workspace-relative images', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(
      <MarkdownPreview content="![Relationship Graph](./graph.png)" />,
    ));

    expect(host.querySelector('img')).toBeNull();
    expect(host.querySelector('.markdown-preview-image-placeholder')?.textContent)
      .toBe('Image: Relationship Graph');
    await act(async () => root.unmount());
  });
});
