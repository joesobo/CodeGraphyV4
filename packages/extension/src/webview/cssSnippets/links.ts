const CSS_SNIPPET_LINK_SELECTOR = 'link[data-codegraphy-css-snippet="true"]';

function removeCurrentCssSnippetStylesheets(): void {
  for (const link of Array.from(document.head.querySelectorAll(CSS_SNIPPET_LINK_SELECTOR))) {
    link.remove();
  }
}

function appendCssSnippetStylesheet(href: string): void {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.codegraphyCssSnippet = 'true';
  document.head.appendChild(link);
}

export function replaceCssSnippetStylesheets(stylesheets: readonly string[]): void {
  removeCurrentCssSnippetStylesheets();

  for (const stylesheet of stylesheets) {
    appendCssSnippetStylesheet(stylesheet);
  }
}
