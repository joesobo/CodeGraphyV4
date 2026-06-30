export const siteLinks = {
  home: '/',
  docs: '/docs',
  plugins: '/plugins',
  examples: '/examples',
  github: 'https://github.com/joesobo/CodeGraphyV4',
  marketplace: 'https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy',
} as const;

export const primaryNavigationLinks = [
  { href: siteLinks.docs, label: 'Docs' },
  { href: siteLinks.plugins, label: 'Plugins' },
  { href: siteLinks.examples, label: 'Examples' },
] as const;
