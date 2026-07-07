import { exampleContent } from './examples';
import {
  docsHref,
  examplesHref,
  githubHref,
  homeHref,
  pluginsHref,
  vscodeExtensionHref,
} from './links';
import { pluginContent } from './plugins';

/** A single navigation link. */
export interface NavItem {
  href: string;
  label: string;
  iconUrl?: string;
  /**
   * Special case for top-level nav: this item is still a link, but it can also
   * reveal grouped sublinks when hovered on desktop or expanded on mobile.
   */
  nav?: readonly NavGroup[];
}

/** A titled group of links, as shown in a page sidebar or nav dropdown. */
export interface NavGroup {
  items: readonly NavItem[];
  title?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export const pluginNavGroups: readonly NavGroup[] = [
  { items: [{ href: `${pluginsHref}#features`, label: 'Features' }] },
  {
    title: 'Packages',
    collapsible: true,
    defaultOpen: true,
    items: pluginContent.map((plugin) => ({
      href: plugin.href,
      iconUrl: plugin.iconUrl,
      label: plugin.name,
    })),
  },
  {
    items: [
      { href: `${pluginsHref}#install`, label: 'Install' },
      { href: `${pluginsHref}#build`, label: 'Build' },
    ],
  },
];

export const exampleNavGroups: readonly NavGroup[] = [
  {
    title: 'Language examples',
    collapsible: true,
    defaultOpen: true,
    items: exampleContent
      .filter((example) => example.category === 'language')
      .map((example) => ({ href: example.href, iconUrl: example.iconUrl, label: example.name })),
  },
  {
    title: 'Plugin examples',
    collapsible: true,
    items: exampleContent
      .filter((example) => example.category === 'plugin')
      .map((example) => ({ href: example.href, iconUrl: example.iconUrl, label: example.name })),
  },
];

/** Everything the navbar and mobile menu show. Edit here to change the site's navigation. */
export const siteNavigation = {
  home: { href: homeHref, label: 'Home' },
  primary: [
    { href: docsHref, label: 'Docs' },
    { href: pluginsHref, label: 'Plugins', nav: pluginNavGroups },
    { href: examplesHref, label: 'Examples', nav: exampleNavGroups },
  ],
  github: { href: githubHref, label: 'GitHub' },
  install: { href: vscodeExtensionHref, label: 'Install' },
} satisfies {
  home: NavItem;
  primary: readonly NavItem[];
  github: NavItem;
  install: NavItem;
};
