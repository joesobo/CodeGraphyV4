export function renderLlmsTxt(siteUrl: URL): string {
  const siteOrigin = siteUrl.origin;

  return `# CodeGraphy

> CodeGraphy builds a local Relationship Graph of the files, symbols, packages, and connections in a CodeGraphy Workspace.

CodeGraphy provides one graph for the VS Code extension, Core CLI, coding agents, and Plugins. Indexing writes a SQLite Graph Cache on disk. Source code stays in the workspace.

## Start here

Install the Core CLI:

\`\`\`sh
npm i -g @codegraphy-dev/core
\`\`\`

Index a workspace before you query it:

\`\`\`sh
codegraphy index
codegraphy search "symbol name"
codegraphy dependencies path/to/file.ts
\`\`\`

The CodeGraphy Agent Skill teaches shell-capable agents to use the narrowest useful Graph Query before reading source.

## Website

- [Home](${siteOrigin}/): Product overview and VS Code installation.
- [Docs](${siteOrigin}/docs): Product, CLI, settings, and Plugin documentation.
- [Plugins](${siteOrigin}/plugins): Official Plugin packages and installation steps.
- [Examples](${siteOrigin}/examples): Runnable example workspaces and their graphs.

## Primary documentation

- [Project docs](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/README.md)
- [Core CLI](https://github.com/joesobo/CodeGraphyV4/blob/main/packages/core/README.md)
- [Commands](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/COMMANDS.md)
- [Settings](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/SETTINGS.md)
- [Agent Skill](https://github.com/joesobo/CodeGraphyV4/blob/main/skills/codegraphy/SKILL.md)
- [Plugin guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Plugin API lifecycle](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/plugin-api/LIFECYCLE.md)
- [Plugin API types](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/plugin-api/TYPES.md)
- [Example workspaces](https://github.com/joesobo/CodeGraphyV4/blob/main/examples/README.md)

## Official Plugin packages

- [TypeScript](https://www.npmjs.com/package/@codegraphy-dev/plugin-typescript)
- [Vue](https://www.npmjs.com/package/@codegraphy-dev/plugin-vue)
- [Svelte](https://www.npmjs.com/package/@codegraphy-dev/plugin-svelte)
- [Godot](https://www.npmjs.com/package/@codegraphy-dev/plugin-godot)
- [Unity](https://www.npmjs.com/package/@codegraphy-dev/plugin-unity)
- [Markdown](https://www.npmjs.com/package/@codegraphy-dev/plugin-markdown)
- [Particles](https://www.npmjs.com/package/@codegraphy-dev/plugin-particles)

## Project links

- [GitHub repository](https://github.com/joesobo/CodeGraphyV4)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy)
`;
}
