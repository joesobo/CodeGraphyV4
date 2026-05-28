import {
  Bot,
  BrainCircuit,
  Bookmark,
  Database,
  FileImage,
  MapPinned,
  Monitor,
  Network,
  Pin,
  Palette,
  Plug,
  Search,
} from 'lucide-react';

export const installHref = 'https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy';
export const githubHref = 'https://github.com/joesobo/CodeGraphyV4';
export const cliPackageHref = 'https://www.npmjs.com/package/@codegraphy-dev/cli';
export const mcpPackageHref = 'https://www.npmjs.com/package/@codegraphy-dev/mcp';
export const typescriptPluginHref = 'https://www.npmjs.com/package/@codegraphy-dev/plugin-typescript';
export const pluginApiPackageHref = 'https://www.npmjs.com/package/@codegraphy-dev/plugin-api';
export const pluginDocsHref = `${githubHref}/blob/main/docs/PLUGINS.md`;
export const pluginLifecycleHref = `${githubHref}/blob/main/docs/plugin-api/LIFECYCLE.md`;
export const pluginTypesHref = `${githubHref}/blob/main/docs/plugin-api/TYPES.md`;
export const cliDocsHref = `${githubHref}/blob/main/docs/COMMANDS.md`;
export const mcpDocsHref = `${githubHref}/blob/main/docs/MCP.md`;
export const coreReadmeHref = `${githubHref}/blob/main/packages/core/README.md`;
export const rootReadmeHref = `${githubHref}/blob/main/README.md`;
export const githubIssuesHref = `${githubHref}/issues`;

export type FaqTextPart =
  | string
  | {
      href: string;
      kind: 'link';
      text: string;
    }
  | {
      kind: 'code';
      text: string;
    };

export type FaqAnswerBlock =
  | {
      parts: FaqTextPart[];
      type: 'paragraph';
    }
  | {
      items: FaqTextPart[][];
      label?: string;
      type: 'list';
    }
  | {
      code: string;
      type: 'code';
    }
  | {
      alt: string;
      caption: string;
      src: string;
      type: 'image';
    }
  | {
      label?: string;
      links: Array<{
        href: string;
        text: string;
      }>;
      type: 'links';
    };

export type FaqItem = {
  answer: FaqAnswerBlock[];
  question: string;
};

export const workflowSteps = [
  {
    description: 'Start with a file, folder, symbol, or phrase and let the graph narrow around the work in front of you.',
    icon: Search,
    image: '/product-media/codegraphy-architecture.png',
    title: 'Search',
  },
  {
    description: 'Hide noise, focus Graph Scope, and keep the visible map small enough to reason about.',
    icon: Network,
    image: '/product-media/plugins-panel.png',
    title: 'Filter',
  },
  {
    description: 'Use colors, shapes, and icons to customize the appearance of the graph.',
    icon: Palette,
    image: '/product-media/relationship-graph-2d.png',
    title: 'Theme',
  },
];

export const socialProofItems = [
  {
    href: 'https://github.com/godotengine/godot',
    icon: Palette,
    image: '/product-media/symbol-nodes-graph.png',
    title: 'Godot',
  },
  {
    href: 'https://github.com/shadcn-ui/ui',
    icon: MapPinned,
    image: '/product-media/graph-sections.png',
    title: 'shadcn/ui',
  },
  {
    href: githubHref,
    icon: Network,
    image: '/product-media/relationship-graph-2d.png',
    title: 'CodeGraphy',
  },
];

export const galleryItems = [
  {
    icon: BrainCircuit,
    image: '/product-media/large-repo-graph.png',
    text: 'Core ships with Tree-sitter analysis and Material Icons. Most languages start with useful connections, themes, and file icons out of the box.',
    title: 'Analysis and Themes',
  },
	{
    icon: Network,
    image: '/product-media/relationship-graph-2d.png',
    text: 'Folder context stays visible so you can return to a familiar view.',
    title: 'Folder view',
  },
  {
    icon: Monitor,
    image: '/product-media/relationship-graph-3d.png',
    text: 'View the graph in 2D or 3D.',
    title: '3D view',
  },
  {
    icon: Search,
    image: '/product-media/search-filter-panel.png',
    text: 'Search and filter out any of the noise from the graph to focus on what you care about.',
    title: 'Search and filters',
  },
  {
    icon: Plug,
    image: '/product-media/plugins-panel.png',
    text: 'Plugin ecosystem to modify and extend the CodeGraphy to support your specific needs.',
    title: 'Plugin system',
  },
  {
    icon: Database,
    image: '/product-media/codegraphy-architecture.png',
    text: 'Internal examples folder showing off CodeGraphy working on numerous example projects in various languages at once. (insert link)',
    title: 'Examples',
  },
];

export const coreFeatures = [
  {
    icon: Network,
    text: 'Relationship Graph with files, folders, packages, symbols, and plugin nodes',
  },
  {
    icon: Database,
    text: 'Local Graph Cache in the workspace',
  },
  {
    icon: Search,
    text: 'Search, filters, and Graph Scope',
  },
  {
    icon: Palette,
    text: 'Integrated VS Code theming and Legend styling',
  },
  {
    icon: Monitor,
    text: '2D or 3D graph views',
  },
  {
    icon: Bot,
    text: 'CLI and local MCP access for agents',
  },
  {
    icon: Plug,
    text: 'Plugin API for language and framework enrichment',
  },
];

export const optionalPackages = [
  {
    description: 'Pins, sections, bookmarks, and polished export tools.',
    features: [
      {
        icon: MapPinned,
        text: 'Sections for shaping clusters into named areas',
      },
      {
        icon: Pin,
        text: 'Pin nodes so you remember where they are',
      },
      {
        icon: Bookmark,
        text: 'Bookmark graph settings and organization patterns',
      },
      {
        icon: FileImage,
        text: 'Advanced exports for polished graph internals and shareable map artifacts',
      },
    ],
    href: null,
    name: 'Organize',
    screenshots: [
      {
        image: '/product-media/graph-sections.png',
        title: 'Sections',
      },
      {
        image: '/product-media/search-filter-panel.png',
        title: 'Bookmarks',
      },
      {
        image: '/product-media/relationship-graph-2d.png',
        title: 'Pins',
      },
    ],
  },
];

export const faqItems: FaqItem[] = [
  {
    answer: [
      {
        parts: [
          'CodeGraphy has three surfaces that can read the same local map: the ',
          { href: installHref, kind: 'link', text: 'VS Code extension' },
          ', the ',
          { href: cliPackageHref, kind: 'link', text: 'CodeGraphy CLI' },
          ', and the ',
          { href: mcpPackageHref, kind: 'link', text: 'CodeGraphy MCP package' },
          '.',
        ],
        type: 'paragraph',
      },
      {
        items: [
          [
            'Install the VS Code extension.',
          ],
          [
            'Index the repo from the CodeGraphy view or with the CLI.',
          ],
          [
            'Install ',
            { kind: 'code', text: '@codegraphy-dev/plugin-typescript' },
            ' for TypeScript and JavaScript relationships.',
          ],
          [
            'Turn the TypeScript plugin on from the extension UI or with the CLI, then re-index.',
          ],
        ],
        label: 'Starting path',
        type: 'list',
      },
      {
        code: 'npm install -g @codegraphy-dev/plugin-typescript\ncodegraphy index\ncodegraphy plugins enable @codegraphy-dev/plugin-typescript\ncodegraphy index',
        type: 'code',
      },
      {
        alt: 'CodeGraphy architecture diagram showing core, plugins, the extension, CLI, and MCP reading the same graph data',
        caption: 'Core indexes the workspace, plugins enrich the graph, then the extension, CLI, and MCP can read the same relationships.',
        src: '/product-media/codegraphy-architecture.png',
        type: 'image',
      },
      {
        label: 'Setup links',
        links: [
          { href: installHref, text: 'VS Code extension' },
          { href: cliPackageHref, text: 'CLI package' },
          { href: cliDocsHref, text: 'CLI docs' },
          { href: typescriptPluginHref, text: 'TypeScript plugin' },
          { href: mcpPackageHref, text: 'MCP package' },
          { href: mcpDocsHref, text: 'MCP setup docs' },
        ],
        type: 'links',
      },
    ],
    question: 'Quickstart',
  },
  {
    answer: [
      {
        parts: [
          'Yes. The core, extension, CLI, MCP, Plugin API, and several example plugin packages are open source in the CodeGraphy monorepo.',
        ],
        type: 'paragraph',
      },
      {
        items: [
          ['Inspect the source, docs, package readmes, and plugin examples on GitHub.'],
          ['Private paid plugins are separate plugins integrated on top of the core that require login.'],
        ],
        type: 'list',
      },
      {
        label: 'Open-source links',
        links: [
          { href: githubHref, text: 'GitHub' },
          { href: coreReadmeHref, text: 'Core package' },
          { href: cliPackageHref, text: 'CLI package' },
          { href: mcpPackageHref, text: 'MCP package' },
          { href: pluginApiPackageHref, text: 'Plugin API' },
        ],
        type: 'links',
      },
    ],
    question: 'Is CodeGraphy open source?',
  },
  {
    answer: [
      {
        parts: [
          'Connections are made during local indexing. CodeGraphy discovers files, reads folder and package structure, runs Tree-sitter analysis, applies enabled plugins, then writes the result into a workspace local Graph Cache.',
        ],
        type: 'paragraph',
      },
      {
        label: 'Read the local graph docs',
        links: [
          { href: coreReadmeHref, text: 'Core package README' },
        ],
        type: 'links',
      },
    ],
    question: 'How are connections made?',
  },
  {
    answer: [
      {
        parts: [
          'Plugins extend CodeGraphy to support a language, framework, file format, or private codebase convention.',
        ],
        type: 'paragraph',
      },
      {
        items: [
          ['Add new kinds of nodes or relationships'],
          ['Set ecosystem defaults such as filters, icons, and color themes'],
          ['Represent private architecture rules or internal framework conventions'],
        ],
        label: 'Plugins can be used to',
        type: 'list',
      },
      {
        label: 'Explore plugin docs',
        links: [
          { href: pluginDocsHref, text: 'Plugin Guide' },
          { href: pluginApiPackageHref, text: 'Plugin API package' },
          { href: pluginTypesHref, text: 'Plugin API types' },
        ],
        type: 'links',
      },
    ],
    question: 'What are plugins?',
  },
  {
    answer: [
      {
        parts: ['Install the plugin, refresh CodeGraphy\'s plugin cache, enable it for the current workspace, then re-index.'],
        type: 'paragraph',
      },
      {
        code: 'npm install -g @codegraphy-dev/plugin-python\ncodegraphy plugins refresh\ncodegraphy plugins enable @codegraphy-dev/plugin-python\ncodegraphy index',
        type: 'code',
      },
      {
        label: 'Install a plugin',
        links: [
          { href: 'https://www.npmjs.com/package/@codegraphy-dev/plugin-typescript', text: 'TypeScript/JavaScript' },
          { href: 'https://www.npmjs.com/package/@codegraphy-dev/plugin-python', text: 'Python' },
          { href: 'https://www.npmjs.com/package/@codegraphy-dev/plugin-csharp', text: 'C#' },
          { href: 'https://www.npmjs.com/package/@codegraphy-dev/plugin-godot', text: 'Godot' },
          { href: 'https://www.npmjs.com/package/@codegraphy-dev/plugin-markdown', text: 'Markdown' },
        ],
        type: 'links',
      },
    ],
    question: 'How do I install plugins?',
  },
  {
    answer: [
      {
        parts: [
          'Start with ',
          { href: pluginApiPackageHref, kind: 'link', text: '@codegraphy-dev/plugin-api' },
          ' for the typed contracts, then follow the Plugin Guide for package metadata, lifecycle hooks, analysis results, and local testing.',
        ],
        type: 'paragraph',
      },
      {
        label: 'Build your own plugin',
        links: [
          { href: pluginApiPackageHref, text: 'Plugin API npm package' },
          { href: `${githubHref}/blob/main/packages/plugin-api/README.md`, text: 'Plugin API README' },
          { href: pluginDocsHref, text: 'Plugin Guide' },
          { href: pluginLifecycleHref, text: 'Lifecycle docs' },
        ],
        type: 'links',
      },
    ],
    question: 'How do I make plugins?',
  },
  {
    answer: [
      {
        parts: [
          'Open a GitHub issue for bugs, feature requests, or ideas you want discussed. Contributions are always welcome.',
        ],
        type: 'paragraph',
      },
      {
        label: 'Contribute',
        links: [
          { href: githubHref, text: 'GitHub' },
          { href: githubIssuesHref, text: 'Issues' },
        ],
        type: 'links',
      },
    ],
    question: 'Where do I report bugs or contribute?',
  },
];
