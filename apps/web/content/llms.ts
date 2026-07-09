export function renderLlmsTxt(siteUrl: URL): string {
  const siteOrigin = siteUrl.origin;

  return `# CodeGraphy

> CodeGraphy indexes a CodeGraphy Workspace into one local Relationship Graph for VS Code, coding agents, the CLI, and Plugins.

Use this as the agent-readable entry point for CodeGraphy. Prefer the linked Markdown docs and package pages for implementation details. CodeGraphy is local-first: Indexing writes a Graph Cache on disk, and MCP tools let agents query that same cache without rereading every file.

Key terms: Relationship Graph, CodeGraphy Workspace, Indexing, Graph Cache, Graph Query, Graph Scope, Graph View, MCP server, Plugin API, VS Code extension.

## Site pages

- [Website home](${siteOrigin}/): High-level product overview for CodeGraphy and the Relationship Graph.
- [Docs](${siteOrigin}/docs): Curated documentation index for product guides, Plugin authors, examples, and packages.
- [Plugins](${siteOrigin}/plugins): Built-in Plugin packages, supported languages, and a concrete install/register/enable workflow.
- [Examples](${siteOrigin}/examples): Runnable example CodeGraphy Workspaces showing what CodeGraphy extracts for each language or Plugin.

## Agent entry points

- [Docs overview](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/README.md): Start here for the project docs index and the main reference map.
- [Commands](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/COMMANDS.md): Every command and keybinding the extension contributes, and what each one does.
- [Settings](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/SETTINGS.md): The .codegraphy/settings.json reference: Filters, physics, colors, and theming.
- [MCP server](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/MCP.md): Headless Indexing and Graph Query tools so agents can read the same Graph Cache.
- [Plugin API lifecycle](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/plugin-api/LIFECYCLE.md): The hooks a Plugin implements and when the Core Package calls them during Indexing.
- [Plugin API types](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/plugin-api/TYPES.md): The typed contracts exported by @codegraphy-dev/plugin-api.
- [Examples README](https://github.com/joesobo/CodeGraphyV4/blob/main/examples/README.md): Runnable CodeGraphy Workspaces used to verify language and Plugin coverage.
- [Core package](https://github.com/joesobo/CodeGraphyV4/blob/main/packages/core/README.md): Core Package entry point for discovery, Indexing, and Relationship Graph concepts.

## Plugin packages

- [@codegraphy-dev/plugin-typescript](https://www.npmjs.com/package/@codegraphy-dev/plugin-typescript): Core web app and library support for imports, exports, aliases, symbols, and inheritance Edges.
- [@codegraphy-dev/plugin-vue](https://www.npmjs.com/package/@codegraphy-dev/plugin-vue): Vue single-file component support for script blocks, component imports, type imports, and lazy component Edges.
- [@codegraphy-dev/plugin-svelte](https://www.npmjs.com/package/@codegraphy-dev/plugin-svelte): Svelte component support for module scripts, instance scripts, type imports, and lazy module imports.
- [@codegraphy-dev/plugin-godot](https://www.npmjs.com/package/@codegraphy-dev/plugin-godot): Godot project support for scenes, resources, autoloads, GDScript inheritance, and class_name symbols.
- [@codegraphy-dev/plugin-unity](https://www.npmjs.com/package/@codegraphy-dev/plugin-unity): Unity project support for scenes, prefabs, GameObjects, Components, ScriptableObjects, and resolved script references.
- [@codegraphy-dev/plugin-markdown](https://www.npmjs.com/package/@codegraphy-dev/plugin-markdown): Document Relationship Graph support for Markdown links, wiki-style notes, mixed docs/code Relationships, and references.
- [@codegraphy-dev/plugin-particles](https://www.npmjs.com/package/@codegraphy-dev/plugin-particles): Visual Relationship Graph background effects and Plugin-provided webview assets for customizing the graph stage.

## Example workspaces

- [TypeScript example](${siteOrigin}/examples#typescript): Runnable palette generator with imports, type imports, exports, dynamic imports, and path aliases. CodeGraphy Workspace: examples/example-typescript.
- [JavaScript example](${siteOrigin}/examples#javascript): Small JavaScript workspace mirroring the TypeScript Relationship Graph story with imports, calls, and inheritance. CodeGraphy Workspace: examples/example-javascript.
- [Vue example](${siteOrigin}/examples#vue): Vue 3 single-file component workspace with script setup, type imports, and async components. CodeGraphy Workspace: examples/example-vue.
- [Svelte example](${siteOrigin}/examples#svelte): Svelte component fixture with module scripts, instance scripts, type imports, and lazy modules. CodeGraphy Workspace: examples/example-svelte.
- [Godot example](${siteOrigin}/examples#godot): Runnable Godot project with scenes, resources, autoloads, GDScript inheritance, and class_name symbols. CodeGraphy Workspace: examples/example-godot.
- [Unity example](${siteOrigin}/examples#unity): Unity sample with scenes, prefabs, GameObjects, Components, ScriptableObjects, and C# scripts. CodeGraphy Workspace: examples/example-unity.
- [Python example](${siteOrigin}/examples#python): Import-resolution workspace with config, services, namespace imports, and inheritance. CodeGraphy Workspace: examples/example-python.
- [C# example](${siteOrigin}/examples#csharp): Task dispatch workspace with types, members, variables, inheritance, interfaces, and events. CodeGraphy Workspace: examples/example-csharp.
- [Java example](${siteOrigin}/examples#java): Compact Java import and inheritance example with classes, interfaces, and method symbols. CodeGraphy Workspace: examples/example-java.
- [Kotlin example](${siteOrigin}/examples#kotlin): Gradle/Kotlin project for imports, simple inheritance, and symbol navigation. CodeGraphy Workspace: examples/example-kotlin.
- [Scala example](${siteOrigin}/examples#scala): Scala app/service/repository/view workspace with import, inheritance, class, object, and trait coverage. CodeGraphy Workspace: examples/example-scala.
- [PHP example](${siteOrigin}/examples#php): Namespace/use and inheritance fixture with class and function symbols. CodeGraphy Workspace: examples/example-php.
- [Ruby example](${siteOrigin}/examples#ruby): Require-relative and inheritance fixture with module, class, and method symbols. CodeGraphy Workspace: examples/example-ruby.
- [Swift example](${siteOrigin}/examples#swift): Swift Package module import example with class, protocol, and function symbols. CodeGraphy Workspace: examples/example-swift.
- [Dart example](${siteOrigin}/examples#dart): Dart package with relative/package imports, model types, runner contracts, and inheritance. CodeGraphy Workspace: examples/example-dart.
- [Rust example](${siteOrigin}/examples#rust): Rust module/use example with functions, structs, enums, and traits. CodeGraphy Workspace: examples/example-rust.
- [Go example](${siteOrigin}/examples#go): Go package/import workspace with functions, receiver methods, structs, interfaces, and constants. CodeGraphy Workspace: examples/example-go.
- [C example](${siteOrigin}/examples#c): Tiny logger with local includes, file-level calls, and C-native symbol Nodes. CodeGraphy Workspace: examples/example-c.
- [C++ example](${siteOrigin}/examples#cpp): Task queue runner with namespaces, aliases, templates, inheritance, overrides, includes, and calls. CodeGraphy Workspace: examples/example-cpp.
- [Objective-C example](${siteOrigin}/examples#objective-c): UIKit-style controller/store/view example with imports, inheritance, and protocol conformance. CodeGraphy Workspace: examples/example-objective-c.
- [Pascal example](${siteOrigin}/examples#pascal): Runner/repository/service/view workspace with unit uses and inheritance. CodeGraphy Workspace: examples/example-pascal.
- [Haskell example](${siteOrigin}/examples#haskell): Cabal/Haskell project showing module imports, data types, typeclasses, and functions. CodeGraphy Workspace: examples/example-haskell.
- [Lua example](${siteOrigin}/examples#lua): Lua require-chain example with table and function symbols. CodeGraphy Workspace: examples/example-lua.
- [Markdown example](${siteOrigin}/examples#markdown): Obsidian-style notes linking to other notes and source files for mixed docs/code Relationship Graph checks. CodeGraphy Workspace: examples/example-markdown.

## Optional

- [GitHub repository](https://github.com/joesobo/CodeGraphyV4): Source repository for CodeGraphy, including packages, docs, examples, and issue history.
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy): Install page for the CodeGraphy VS Code extension.
- [@codegraphy-dev/mcp on npm](https://www.npmjs.com/package/@codegraphy-dev/mcp): Package page for the MCP server used by coding agents.
- [Repository README](https://github.com/joesobo/CodeGraphyV4/blob/main/README.md): Repository-level introduction and development entry point.
`;
}
