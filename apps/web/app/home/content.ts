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
  Workflow,
} from 'lucide-react';

export const installHref = 'https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy';
export const githubHref = 'https://github.com/joesobo/CodeGraphyV4';
export const mcpPackageHref = 'https://www.npmjs.com/package/@codegraphy-dev/mcp';
export const pluginApiPackageHref = 'https://www.npmjs.com/package/@codegraphy-dev/plugin-api';
export const pluginDocsHref = `${githubHref}/blob/main/docs/PLUGINS.md`;
export const pluginLifecycleHref = `${githubHref}/blob/main/docs/plugin-api/LIFECYCLE.md`;
export const pluginTypesHref = `${githubHref}/blob/main/docs/plugin-api/TYPES.md`;
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
    description:
      'CodeGraphy scans the project and builds a local relationship map from the code that is already there.',
    icon: BrainCircuit,
    image: '/product-media/codegraphy-architecture.png',
    title: 'Map the workspace',
  },
  {
    description:
      'Private and open-source plugins can add language, framework, or team-specific meaning to the same map.',
    icon: Plug,
    image: '/product-media/plugins-panel.png',
    title: 'Add meaning',
  },
  {
    description:
      'Use the graph in the editor first, then bring the same local understanding into terminal and agent workflows.',
    icon: Workflow,
    image: '/product-media/relationship-graph-2d.png',
    title: 'Work from the map',
  },
];

export const heroHighlights = [
  {
    icon: BrainCircuit,
    label: 'Scan',
    text: 'Build a map from the workspace you already have.',
  },
  {
    icon: Network,
    label: 'Reveal',
    text: 'See which pieces naturally belong near each other.',
  },
  {
    icon: Search,
    label: 'Focus',
    text: 'Narrow the map when the whole codebase is too much.',
  },
  {
    icon: Bot,
    label: 'Share',
    text: 'Use the same map from editor, terminal, and agent workflows.',
  },
];

export const socialProofItems = [
  {
    icon: Network,
    image: '/product-media/relationship-graph-2d.png',
    text: 'The first example map should prove the tool against its own workspace, packages, docs, and plugin surfaces.',
    title: 'CodeGraphy',
  },
  {
    icon: Palette,
    image: '/product-media/symbol-nodes-graph.png',
    text: 'A Godot map can show how engine-scale code forms different neighborhoods than a TypeScript monorepo.',
    title: 'Godot',
  },
  {
    icon: MapPinned,
    image: '/product-media/graph-sections.png',
    text: 'An open-source AI project can show how model, agent, eval, and tooling code pull into different clusters.',
    title: 'Open-source AI',
  },
];

export const galleryItems = [
  {
    icon: Network,
    image: '/product-media/relationship-graph-2d.png',
    text: 'Folder and package context stays visible without forcing every question back into a file tree.',
    title: 'Folder view',
  },
  {
    icon: Monitor,
    image: '/product-media/relationship-graph-3d.png',
    text: 'Switch into depth when the physical shape of the workspace is the thing you need to understand.',
    title: '3D view',
  },
  {
    icon: Search,
    image: '/product-media/search-filter-panel.png',
    text: 'Search temporarily, then save filters when generated files, tests, or docs are not part of the question.',
    title: 'Search and filters',
  },
  {
    icon: Plug,
    image: '/product-media/plugins-panel.png',
    text: 'Enable ecosystem plugins to add symbols, framework defaults, and richer relationships to the same graph.',
    title: 'Plugin system',
  },
  {
    icon: Workflow,
    image: '/product-media/large-repo-graph.png',
    text: 'Force-based physics lets related code form natural groups instead of pretending folders are the only structure.',
    title: 'Natural clusters',
  },
  {
    icon: Database,
    image: '/product-media/codegraphy-architecture.png',
    text: 'The internal examples folder gives CodeGraphy small, controlled workspaces across TypeScript, Python, Godot, Markdown, and more.',
    title: 'Examples folder',
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
    description: 'Pins, sections, saved setups, and polished graph organization tools.',
    features: [
      {
        icon: MapPinned,
        text: 'Sections for shaping clusters into named areas',
      },
      {
        icon: Pin,
        text: 'Pin nodes to keep important code in place',
      },
      {
        icon: Bookmark,
        text: 'Bookmark graph settings and organization patterns',
      },
      {
        icon: FileImage,
        text: 'Advanced exports for polished graph images and shareable map artifacts',
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
        title: 'Saved setup controls',
      },
      {
        image: '/product-media/relationship-graph-2d.png',
        title: 'Polished graph maps',
      },
    ],
  },
];

export const faqItems: FaqItem[] = [
  {
    answer: [
      {
        parts: [
          'CodeGraphy has three entry points that all read the same local graph: the ',
          { href: installHref, kind: 'link', text: 'VS Code extension' },
          ', the ',
          { href: mcpPackageHref, kind: 'link', text: 'codegraphy CLI and MCP package' },
          ', and the open-source repo docs for deeper setup.',
        ],
        type: 'paragraph',
      },
      {
        items: [
          [
            'Install the VS Code extension when you want the interactive graph beside your editor, then open the CodeGraphy view and index the workspace.',
          ],
          [
            'Install ',
            { kind: 'code', text: '@codegraphy-dev/mcp' },
            ' when you want the CLI or local agent access without opening VS Code.',
          ],
          [
            'Run ',
            { kind: 'code', text: 'codegraphy index' },
            ' from a project folder to build the workspace-local Graph Cache.',
          ],
          [
            'Ask an agent questions through MCP, or use the extension graph to inspect the same files, symbols, folders, packages, and plugin relationships visually.',
          ],
        ],
        label: 'Good starting paths',
        type: 'list',
      },
      {
        code: 'npm install -g @codegraphy-dev/mcp\ncodegraphy setup\ncodegraphy index',
        type: 'code',
      },
      {
        alt: 'CodeGraphy architecture diagram showing core, plugins, the extension, CLI, and MCP reading the same graph data',
        caption: 'Core indexes the workspace, plugins enrich the graph, then the extension, CLI, and MCP read the same relationships.',
        src: '/product-media/codegraphy-architecture.png',
        type: 'image',
      },
      {
        label: 'Get started',
        links: [
          { href: installHref, text: 'VS Code extension' },
          { href: mcpPackageHref, text: 'MCP package' },
          { href: mcpDocsHref, text: 'MCP setup docs' },
          { href: rootReadmeHref, text: 'GitHub README' },
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
          'Yes. The core extension, CLI, local MCP package, Plugin API, and first-party plugin packages are open source in the CodeGraphy repo.',
        ],
        type: 'paragraph',
      },
      {
        items: [
          ['Use the VS Code extension and core graph without creating an account.'],
          ['Inspect the source, docs, package readmes, and plugin examples on GitHub.'],
          ['Private paid plugins are separate add-ons layered on top of the open core.'],
        ],
        type: 'list',
      },
      {
        label: 'Open-source links',
        links: [
          { href: githubHref, text: 'GitHub' },
          { href: rootReadmeHref, text: 'README' },
          { href: coreReadmeHref, text: 'Core package' },
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
        items: [
          ['Relationship Graph with file, folder, package, symbol, and plugin nodes'],
          ['Workspace-local Graph Cache under ', { kind: 'code', text: '.codegraphy/' }],
          ['Graph Scope, search, filters, and context actions'],
          ['Integrated VS Code theming and Legend styling'],
          ['2D and 3D graph views'],
          ['Timeline-aware indexing support'],
          ['CLI and local MCP access for agents'],
          ['Plugin API support for language and framework enrichment'],
        ],
        type: 'list',
      },
    ],
    question: 'What features are in core CodeGraphy?',
  },
  {
    answer: [
      {
        parts: [
          'Connections are made during local indexing. CodeGraphy discovers files, reads folder and package structure, runs Tree-sitter analysis, applies enabled plugins, then writes the result into a workspace-local Graph Cache.',
        ],
        type: 'paragraph',
      },
      {
        items: [
          ['Your source is analyzed on your machine.'],
          ['The extension, CLI, and MCP server read the local Graph Cache instead of uploading source code.'],
          ['Plugins can add more relationship evidence, but they still participate in the same local indexing flow.'],
        ],
        label: 'Privacy model',
        type: 'list',
      },
      {
        label: 'Read the local graph docs',
        links: [
          { href: coreReadmeHref, text: 'Core package README' },
          { href: mcpDocsHref, text: 'MCP docs' },
        ],
        type: 'links',
      },
    ],
    question: 'How are code connections made?',
  },
  {
    answer: [
      {
        parts: [
          'Plugins teach CodeGraphy more about a language, framework, file format, or private codebase convention. Core builds the baseline graph; plugins add meaning on top of it.',
        ],
        type: 'paragraph',
      },
      {
        items: [
          ['Add symbols, references, calls, imports, loads, scenes, resources, docs links, or test relationships'],
          ['Contribute Node Types and Edge Types for concepts Core does not know by default'],
          ['Set ecosystem defaults such as filters, colors, and Legend styling'],
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
        parts: ['Install the plugin, refresh CodeGraphy\'s plugin cache, enable it for the current workspace, then re-index. Python is a good example:'],
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
        items: [
          ['Install the Plugin API as a dev dependency.'],
          ['Implement the plugin hooks that add relationship evidence for your files.'],
          ['Declare CodeGraphy metadata in ', { kind: 'code', text: 'package.json' }, ' so the CLI can discover and validate the package.'],
          ['Index a small fixture workspace and inspect the graph before trying the plugin on a large repo.'],
        ],
        type: 'list',
      },
      {
        label: 'Build your own plugin',
        links: [
          { href: pluginApiPackageHref, text: 'Plugin API on npm' },
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
          'Core CodeGraphy does not need an account. Sign in is only needed for private paid plugins, trials, billing, and account-level entitlement checks.',
        ],
        type: 'paragraph',
      },
      {
        items: [
          ['Install and use the open core without signing in.'],
          ['Create a free account when you want website account management.'],
          ['Sign in before using private plugins so CodeGraphy can verify which add-ons belong to you.'],
        ],
        type: 'list',
      },
    ],
    question: 'Do private plugins need sign in?',
  },
  {
    answer: [
      {
        parts: [
          'Open a GitHub issue for bugs, rough edges, docs gaps, or repo examples you want mapped. Contributions can start with docs, plugin examples, or focused fixes.',
        ],
        type: 'paragraph',
      },
      {
        label: 'Contribute',
        links: [
          { href: githubHref, text: 'GitHub' },
          { href: githubIssuesHref, text: 'Issues' },
          { href: pluginDocsHref, text: 'Plugin Guide' },
        ],
        type: 'links',
      },
    ],
    question: 'Where do I report bugs or contribute?',
  },
];
