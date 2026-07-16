import { markCssColorsChanged } from '../cssColors/resolver';

const CSS_SNIPPET_LINK_SELECTOR = 'link[data-codegraphy-css-snippet="true"]';

function removeCurrentCssSnippetStylesheets(): void {
  for (const link of Array.from(document.head.querySelectorAll(CSS_SNIPPET_LINK_SELECTOR))) {
    link.remove();
    markCssColorsChanged();
  }
}

function appendCssSnippetStylesheet(href: string): void {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.codegraphyCssSnippet = 'true';
  link.addEventListener('load', markCssColorsChanged, { once: true });
  document.head.appendChild(link);
  markCssColorsChanged();
}

export function replaceCssSnippetStylesheets(stylesheets: readonly string[]): void {
  removeCurrentCssSnippetStylesheets();

  for (const stylesheet of stylesheets) {
    appendCssSnippetStylesheet(stylesheet);
  }
}
