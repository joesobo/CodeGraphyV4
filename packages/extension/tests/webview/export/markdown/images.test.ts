import { describe, expect, it } from 'vitest';
import { renderMarkdownImagesSection } from '../../../../src/webview/export/markdown/images';

describe('exportMarkdownImages', () => {
  it('renders the none state when no export images exist', () => {
    expect(renderMarkdownImagesSection({})).toEqual(['- none', '']);
  });

  it('renders image ownership lines with grouped patterns', () => {
    expect(renderMarkdownImagesSection({
      '.codegraphy/images/src.png': {
        groups: ['src/**', '*.tsx'],
      },
    })).toEqual([
      '- `.codegraphy/images/src.png` (groups: `src/**`, `*.tsx`)',
      '',
    ]);
  });
});
