# Extract Pro

## Trello

- Parent roadmap: https://trello.com/c/3lNaOKjn/149-codegraphy-productization-roadmap
- Task card: https://trello.com/c/x2WvUEPs/141-extract-pro
- Prerequisite: https://trello.com/c/GUCBeHpV/139-extract-core-from-extension-package

## Goal

Extract paid feature behavior out of the free/base extension path while expanding the public plugin API so private first-party and future community plugins can integrate with Core and the Graph View without depending on VS Code-specific code.

Free CodeGraphy keeps Relationship Graph inspection, Graph Scope, filters/search, Legend/theme editing, normal graph rendering/physics, Graph Cache, Graph Query, CLI/MCP access, and free first-party plugins.

## Product Terms

- Use **Access**, not entitlement.
- Use **CodeGraphy Workspace** for any folder CodeGraphy can analyze.
- Use **Graph Cache** for `<workspace-root>/.codegraphy/graph.lbug`.
- Treat Pro as the optional account/access plugin.
- Treat paid feature behavior as private package-owned behavior that integrates through the public plugin API.

## Execution Slices

1. Expand `@codegraphy/plugin-api` with public contracts for Core plugins, Access, plugin data, graph presentation metadata, Graph View runtime contributions, context menu contributions, UI slots, projections, and additive force adapters.
2. Add Core-owned plugin runtime and Access checks so Extension, CLI, and MCP can consume the same availability model.
3. Add plugin data `loadData` / `saveData` persistence scoped by plugin id under Workspace Settings.
4. Add Graph View contribution hosts for runtime nodes/edges, projection, context menus, named UI slots, and additive force adapters.
5. Create the optional public `@codegraphy/pro` package for account/status UI contribution and Access Provider registration.
6. Extract paid feature behavior behind plugin contributions and remove free/base extension ownership without legacy feature-specific migration.
7. Add focused red-green tests for each public behavior, then run the repo quality gates.
8. Update product docs, package docs, changesets, Trello checklist state, and the PR description after implementation is green.

## Acceptance Test

A plugin can contribute an additive D3 force adapter through the public plugin API, the extension installs it into the Graph View physics host, the force affects runtime graph nodes, and disabling/removing the plugin disposes the namespaced force without touching base graph forces.

## Non-Goals For This PR

- No billing provider implementation. Account, Stripe/Supabase/Vercel, and subscription mechanics belong to the follow-up Pro Account, Billing, and Access card.
- No Bookmarks implementation. Bookmarks build on the extracted private-plugin foundation.
- No Team Bookmark Sync implementation.
