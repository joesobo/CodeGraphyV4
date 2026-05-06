import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const INDEX_CSS_PATH = path.join(process.cwd(), 'src', 'webview', 'index.css');

describe('graph background theme tokens', () => {
  it('uses the same surface token as the search and filter shell', () => {
    const css = readFileSync(INDEX_CSS_PATH, 'utf8');

    expect(css).toMatch(/--cg-graph-background:\s*var\(--cg-popover-translucent\);/);
  });

  it('keeps the graph viewport borderless so the shared surface carries the inset shape', () => {
    const css = readFileSync(INDEX_CSS_PATH, 'utf8');

    expect(css).toMatch(/--cg-graph-border:\s*var\(--cg-transparent\);/);
  });

  it('uses the primary theme token for directional graph indicators', () => {
    const css = readFileSync(INDEX_CSS_PATH, 'utf8');

    expect(css).toMatch(/--cg-graph-link-highlight:\s*var\(--cg-primary\);/);
  });
});
