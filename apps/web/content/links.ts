export const homeHref = '/';
export const docsHref = '/docs';
export const pluginsHref = '/plugins';
export const examplesHref = '/examples';

export const githubHref = 'https://github.com/joesobo/CodeGraphyV4';
export const discordHref = 'https://discord.gg/Z75vbkt4Ry';
export const githubBlobHref = `${githubHref}/blob/main`;
export const githubTreeHref = `${githubHref}/tree/main`;

export const desktopRelease = {
  available: false,
  label: 'Signed macOS download pending',
  minimumSystemVersion: 'macOS 26',
  sourceHref: `${githubTreeHref}/apps/desktop`,
} as const;

export const marketplaceHref = 'https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy';
export const vscodeExtensionHref = 'vscode:extension/codegraphy.codegraphy';

export const npmPackageRootHref = 'https://www.npmjs.com/package';
export const npmRegistryRootUrl = 'https://registry.npmjs.org';
export const extensionVersionUrl = 'https://raw.githubusercontent.com/joesobo/CodeGraphyV4/main/packages/extension/package.json';
