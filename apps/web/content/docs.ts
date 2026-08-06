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
    summary: 'Daily extension use, including commands, Graph View interactions, and settings.',
    links: [
      {
        id: 'overview',
        title: 'Docs overview',
        href: `${githubBlobHref}/docs/README.md`,
        summary: 'Start here for the project docs index and the main reference map.',
      },
      {
        id: 'desktop',
        title: 'macOS desktop app',
        href: `${githubBlobHref}/apps/desktop/README.md`,
        summary: 'Current three-pane behavior, macOS requirements, local packaging, and the signed-download gate.',
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
        summary: 'The .codegraphy/settings.json reference for Graph Scope, Filters, display settings, diagnostics, and theming.',
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
        title: 'Core Plugin API lifecycle',
        href: `${githubBlobHref}/docs/plugin-api/LIFECYCLE.md`,
        summary: 'The headless hooks a Core Plugin implements and when Core calls them during Indexing.',
      },
      {
        id: 'plugin-api-types',
        title: 'Core Plugin API types',
        href: `${githubBlobHref}/docs/plugin-api/TYPES.md`,
        summary: 'The typed contracts exported by @codegraphy-dev/plugin-api.',
      },
      {
        id: 'extension-plugin-api',
        title: 'Extension Plugin API lifecycle',
        href: `${githubBlobHref}/docs/extension-plugin-api/LIFECYCLE.md`,
        summary: 'The VS Code Extension, Graph View, panel, and cleanup lifecycle.',
      },
      {
        id: 'extension-plugin-api-types',
        title: 'Extension Plugin API types',
        href: `${githubBlobHref}/docs/extension-plugin-api/TYPES.md`,
        summary: 'The typed contracts exported by @codegraphy-dev/extension-plugin-api.',
      },
      {
        id: 'extension-plugin-api-events',
        title: 'Extension Plugin API events',
        href: `${githubBlobHref}/docs/extension-plugin-api/EVENTS.md`,
        summary: 'The Extension-owned event payload vocabulary and its current limits.',
      },
    ],
  },
  {
    title: 'Packages',
    summary: 'READMEs for the packages that make up the monorepo.',
    links: [
      {
        id: 'desktop-package',
        title: 'Desktop app',
        href: `${githubBlobHref}/apps/desktop/README.md`,
        summary: 'Tauri shell, local Core process, File editor, Relationship Graph, and macOS package checks.',
      },
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
