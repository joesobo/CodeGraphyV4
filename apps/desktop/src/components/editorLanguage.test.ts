import { describe, expect, it } from 'vitest';
import { findEditorLanguage, loadEditorLanguage } from './editorLanguage';
import { isMarkdownPath } from './markdownPath';

describe('desktop editor languages', () => {
  it.each([
    ['src/app.ts', 'TypeScript'],
    ['src/App.tsx', 'TSX'],
    ['tools/check.py', 'Python'],
    ['src/lib.rs', 'Rust'],
    ['native/main.c', 'C'],
    ['native/graph.cpp', 'C++'],
    ['cmd/codegraphy/main.go', 'Go'],
    ['fixtures/graph.json', 'JSON'],
    ['config/site.yaml', 'YAML'],
    ['public/index.html', 'HTML'],
    ['styles/theme.css', 'CSS'],
    ['containers/Dockerfile', 'Dockerfile'],
    ['native/CMakeLists.txt', 'CMake'],
    ['README.md', 'Markdown'],
    ['docs/guide.mdx', 'Markdown'],
  ])('matches %s to the maintained %s language support', async (path, expectedName) => {
    expect(findEditorLanguage(path)?.name).toBe(expectedName);
    expect(await loadEditorLanguage(path)).toBeDefined();
  });

  it('keeps Markdown presentation limited to Markdown Files', () => {
    expect(isMarkdownPath('README.md')).toBe(true);
    expect(isMarkdownPath('docs/guide.mdx')).toBe(true);
    expect(isMarkdownPath('docs/history.markdown')).toBe(true);
    expect(isMarkdownPath('src/markdown.ts')).toBe(false);
  });
});
