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
- Diagram format: use Mermaid in README so the high-level flow stays editable in docs.
- Docs scope for this PR: focus the full rewrite on the root README, then update supporting docs only where media references or broken user-facing links were stale.
