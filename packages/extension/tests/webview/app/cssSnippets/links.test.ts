import { beforeEach, describe, expect, it } from 'vitest';
import { cssColorRevision } from '../../../../src/webview/cssColors/resolver';
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

    replaceCssSnippetStylesheets(['webview://ocean.css']);

    expect(snippetLinks().map(link => link.href)).toEqual(['webview://ocean.css']);
  });

  it('invalidates computed graph colors when snippet styles are added and loaded', () => {
    const initialRevision = cssColorRevision();

    replaceCssSnippetStylesheets(['webview://theme.css']);
    const appendedRevision = cssColorRevision();
    snippetLinks()[0]?.dispatchEvent(new Event('load'));

    expect(appendedRevision).toBeGreaterThan(initialRevision);
    expect(cssColorRevision()).toBeGreaterThan(appendedRevision);
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
