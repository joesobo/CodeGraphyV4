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

export const docsGroups: readonly DocsGroup[] = [
  {
    title: 'Product guides',
    summary: 'Day-to-day usage of the extension — commands, Graph View interactions, and settings.',
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
        summary: 'Every command and keybinding the extension contributes, and what each one does.',
      },
      {
        id: 'interactions',
        title: 'Interactions',
        href: `${githubBlobHref}/docs/INTERACTIONS.md`,
        summary: 'How selection, dragging, hovering, and context actions behave in the Graph View.',
      },
      {
        id: 'settings',
        title: 'Settings',
        href: `${githubBlobHref}/docs/SETTINGS.md`,
        summary: 'The .codegraphy/settings.json reference — Graph Scope, Filters, display settings, diagnostics, and theming.',
      },
      {
        id: 'core-cli',
        title: 'Core CLI',
        href: `${githubBlobHref}/packages/core/README.md`,
        summary: 'Headless Indexing, Graph Query, diagnostics, Graph Scope, Filter, and Plugin commands.',
      },
      {
        id: 'agent-skill',
        title: 'CodeGraphy Agent Skill',
        href: `${githubBlobHref}/skills/codegraphy/SKILL.md`,
        summary: 'A reusable workflow that teaches shell-capable agents to index and run bounded Graph Queries before broad source search.',
      },
      {
        id: 'examples',
        title: 'Examples',
        href: `${githubBlobHref}/examples/README.md`,
        summary: 'Runnable CodeGraphy Workspaces that show language and Plugin Relationship Graph coverage.',
      },
    ],
  },
  {
    title: 'Plugin authors',
    summary: 'The Plugin model and the typed contracts for building your own Plugin.',
    links: [
      {
        id: 'plugins',
        title: 'Plugins',
        href: `${githubBlobHref}/docs/PLUGINS.md`,
        summary: 'How Plugins are registered, enabled, and run, plus built-in language coverage.',
      },
      {
        id: 'plugin-api',
        title: 'Plugin API lifecycle',
        href: `${githubBlobHref}/docs/plugin-api/LIFECYCLE.md`,
        summary: 'The hooks a Plugin implements and when the Core Package calls them during Indexing.',
      },
      {
        id: 'plugin-api-types',
        title: 'Plugin API types',
        href: `${githubBlobHref}/docs/plugin-api/TYPES.md`,
        summary: 'The typed contracts exported by @codegraphy-dev/plugin-api.',
      },
      {
        id: 'plugin-api-events',
        title: 'Plugin API events',
        href: `${githubBlobHref}/docs/plugin-api/EVENTS.md`,
        summary: 'The event system Plugins use to react to Indexing and workspace changes.',
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
        summary: 'Core Package entry point for discovery, Indexing, and Relationship Graph concepts.',
      },
      {
        id: 'extension-package',
        title: 'Extension package',
        href: `${githubBlobHref}/packages/extension/docs/README.md`,
        summary: 'Extension-specific implementation and user-facing behavior notes.',
      },
    ],
  },
];
