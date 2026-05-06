# Root README Rework

## Goal

Rework the root `README.md` so a new reader can quickly understand what CodeGraphy is, how to install and use it, what the monorepo contains, what agents can query, and what parts are still evolving.

## Agreed Language

- Lead with CodeGraphy as a VS Code Relationship Graph for understanding relationships between files.
- Keep the WIP and agentic-engineering context clear, but secondary to the product pitch.
- Use the repo glossary terms: Relationship Graph, Graph Cache, Graph Query, Core Extension, Indexing, File Node, Folder Node, Package Node, Plugin Node, Graph Scope, Filter, Search, Visible Graph, and CodeGraphy MCP.
- Avoid leading with dependency graph or generic AI code intelligence language.

## Requested README Coverage

- Replace retired/outdated badges.
- Refresh stale GIFs and images.
- Show Material Icon Theme integration.
- Show VS Code Theme Integration.
- Show major Graph View features: Search, 2D/3D, Timeline, Context Window/Menu, Legend, folders on/off, theme integration.
- Fix the Package Map table.
- Add install guide.
- Add all CLI commands.
- Take inspiration from GitNexus README structure without copying its product language.
- List what an agent has access to through CodeGraphy MCP.
- Add a clean high-level architecture diagram for the monorepo and CodeGraphy flow.
- Add a top-level "How it works" section.
- Make the tech stack a markdown table.
- Link Trello for roadmap.
- Fix the broken Export menu documentation link.
- Emphasize that the project is a WIP being built through agentic engineering.

## Decisions

- Media strategy: use real checked-in screenshots or GIFs captured from the running extension. Do not use generated UI mockups. Remove old outdated media instead of continuing to reference it.
- Screenshot source: run the extension devhost against the main checkout's `.codegraphy` settings and Graph Cache.
- Diagram format: replace the Mermaid flowchart with a preview-safe SVG generated from an editable Excalidraw source because Markdown Preview rendered the Mermaid diagram as plain words.
- Docs scope for this PR: focus the full rewrite on the root README, then update supporting docs only where media references or broken user-facing links were stale.
- Follow-up media direction: remove Graph Scope, Settings, and Plugins screenshots from the main README gallery.
- Use the supplied local Desktop screenshots for hero, Search, 2D, 3D, large graph, and Timeline media.
- Convert the supplied Desktop screen recording into a checked-in README GIF.
- Add the supplied VS Code Theme Integration screenshot to the README gallery.
- Rename the GIF gallery slot from "Interaction Demo" to "Force Graph".
- Install the `@cmd8/excalidraw-mcp` server in Codex as `excalidraw` and generate an editable Excalidraw source plus README-rendered SVG architecture diagram.
- Iterate the architecture diagram from rendered screenshots: split inputs, analysis, graph model, and surfaces into lanes; keep wording product/domain-focused; route Graph Cache directly to MCP; route Visible Graph to the webview/export surfaces; avoid renderer-sensitive SVG arrow markers.
- CI follow-up: release-script tests should read the current workspace package version instead of hard-coding the old plugin API version.
