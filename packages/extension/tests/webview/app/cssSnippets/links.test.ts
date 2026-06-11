import { beforeEach, describe, expect, it } from 'vitest';
import { replaceCssSnippetStylesheets } from '../../../../src/webview/cssSnippets/links';

function snippetLinks(): HTMLLinkElement[] {
  return Array.from(document.head.querySelectorAll('link[data-codegraphy-css-snippet="true"]'));
}

function stylesheetLinks(): HTMLLinkElement[] {
  return Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
}

describe('webview/cssSnippets/links', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('replaces css snippet stylesheet links in configured order', () => {
    replaceCssSnippetStylesheets(['webview://base.css', 'webview://override.css']);

    expect(snippetLinks().map(link => link.href)).toEqual([
      'webview://base.css',
      'webview://override.css',
    ]);

    replaceCssSnippetStylesheets(['webview://focus.css']);

    expect(snippetLinks().map(link => link.href)).toEqual(['webview://focus.css']);
  });

  it('does not remove non-snippet stylesheet links', () => {
    const appLink = document.createElement('link');
    appLink.rel = 'stylesheet';
    appLink.href = 'webview://app.css';
    document.head.appendChild(appLink);

    replaceCssSnippetStylesheets(['webview://snippet.css']);

    expect(stylesheetLinks().map(link => link.href)).toEqual([
      'webview://app.css',
      'webview://snippet.css',
    ]);

    replaceCssSnippetStylesheets([]);

    expect(stylesheetLinks().map(link => link.href)).toEqual([
      'webview://app.css',
    ]);
  });
});
