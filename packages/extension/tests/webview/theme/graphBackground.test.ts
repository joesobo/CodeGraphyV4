import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const INDEX_CSS_PATH = path.join(process.cwd(), 'src', 'webview', 'index.css');

describe('graph background theme tokens', () => {
  it('mixes enough border color into the graph background to read as recessed', () => {
    const css = readFileSync(INDEX_CSS_PATH, 'utf8');
    const match = css.match(
      /--cg-graph-background:\s*color-mix\(in srgb,\s*var\(--cg-background\)\s+(\d+)%,\s*var\(--cg-border\)\s+(\d+)%\);/,
    );

    expect(match).not.toBeNull();
    const backgroundPercent = Number(match?.[1]);
    const borderPercent = Number(match?.[2]);

    expect(backgroundPercent).toBeLessThanOrEqual(88);
    expect(borderPercent).toBeGreaterThanOrEqual(12);
  });

  it('keeps the graph viewport borderless so the darker surface carries the inset shape', () => {
    const css = readFileSync(INDEX_CSS_PATH, 'utf8');

    expect(css).toMatch(/--cg-graph-border:\s*var\(--cg-transparent\);/);
  });
});
