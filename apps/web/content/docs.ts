import { githubBlobHref } from '@/content/links';

interface DocsGroup {
  title: string;
  summary: string;
  links: readonly {
    id: string;
    title: string;
    href: string;
    summary: string;
  }[];
}

export const docsGroups = [
  {
    title: 'Product guides',
    summary: 'Day-to-day usage of the extension — commands, graph interactions, and settings.',
    links: [
      {
        id: 'overview',
        title: 'Docs overview',
        href: `${githubBlobHref}/docs/README.md`,
        summary: 'Start here for the project docs index and the main reference map.',
      },
      {
        id: 'commands',
        title: 'Commands',
        href: `${githubBlobHref}/docs/COMMANDS.md`,
        summary: 'VS Code command coverage and command behavior notes.',
      },
      {
        id: 'interactions',
        title: 'Interactions',
        href: `${githubBlobHref}/docs/INTERACTIONS.md`,
        summary: 'Graph interaction behavior, controls, and product semantics.',
      },
      {
        id: 'settings',
        title: 'Settings',
        href: `${githubBlobHref}/docs/SETTINGS.md`,
        summary: 'Extension settings, theme-related options, and configuration notes.',
      },
      {
        id: 'timeline',
        title: 'Timeline',
        href: `${githubBlobHref}/docs/TIMELINE.md`,
        summary: 'Index Git history and scrub how the Relationship Graph changes across commits.',
      },
      {
        id: 'mcp',
        title: 'MCP server',
        href: `${githubBlobHref}/docs/MCP.md`,
        summary: 'Headless indexing and Graph Query tools so agents can read the same graph.',
      },
    ],
  },
  {
    title: 'Plugin authors',
    summary: 'The plugin model and the typed contracts for building your own plugin.',
    links: [
      {
        id: 'plugins',
        title: 'Plugins',
        href: `${githubBlobHref}/docs/PLUGINS.md`,
        summary: 'Plugin model, plugin behavior, and language coverage notes.',
      },
      {
        id: 'plugin-api',
        title: 'Plugin API lifecycle',
        href: `${githubBlobHref}/docs/plugin-api/LIFECYCLE.md`,
        summary: 'Plugin authoring lifecycle and how plugins participate in CodeGraphy.',
      },
      {
        id: 'plugin-api-types',
        title: 'Plugin API types',
        href: `${githubBlobHref}/docs/plugin-api/TYPES.md`,
        summary: 'Type contracts for plugin authors.',
      },
      {
        id: 'plugin-api-events',
        title: 'Plugin API events',
        href: `${githubBlobHref}/docs/plugin-api/EVENTS.md`,
        summary: 'Event system reference for plugin integrations.',
      },
    ],
  },
  {
    title: 'Packages',
    summary: 'READMEs for the packages that make up the monorepo.',
    links: [
      {
        id: 'core-package',
        title: 'Core package',
        href: `${githubBlobHref}/packages/core/README.md`,
        summary: 'Core package entry point for discovery, indexing, and graph concepts.',
      },
      {
        id: 'extension-package',
        title: 'Extension package',
        href: `${githubBlobHref}/packages/extension/docs/README.md`,
        summary: 'Extension-specific implementation and user-facing behavior notes.',
      },
    ],
  },
] satisfies readonly DocsGroup[];
