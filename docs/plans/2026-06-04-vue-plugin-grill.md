# Vue Plugin Grill

Trello card: [Vue Plugin](https://trello.com/c/tgflqlgS)

Branch: `codex/vue-plugin-grill-docs`

Worktree: `/Users/poleski/.codex/worktrees/vue-plugin-grill/CodeGraphyV4`

## Starting Context

The card asks for a Vue plugin, a Vue example under `examples/`, and Vue theme/icon support for `.vue` files. The supplied Nuxt DevTools screenshot adds a useful visual reference for component structure, but this card is a Vue plugin card. Nuxt-specific pages, layouts, global-component conventions, and generated workspace semantics are out of scope for the first PR and can be handled by a future Nuxt-specific plugin.

Current repo facts:

- `CONTEXT.md` defines **Plugin Analysis**, **Plugin Node**, **Node Type**, **Relationship**, **Edge Type**, **Graph Scope**, and **Visible Graph** as the relevant language.
- The plugin API already supports plugin-contributed edge types, relations, file styling, node types, nodes, and symbols.
- `.vue` already appears in the Material Theme fallback language list, so file icon fallback may exist before a dedicated Vue plugin.
- Core Tree-sitter analysis does not currently parse `.vue` files, and relative JS/TS import resolution does not currently try `.vue` as a target extension.
- Existing plugin packages follow `packages/plugin-*`, `codegraphy.json`, package-local tests, and small example workspaces.
- Trello is routing only; this plan should become the missing product and technical scope for the card.

## Candidate Scope

### Option A: Vue Single File Component Basics

Add `packages/plugin-vue`, `examples/example-vue`, `.vue` supported extension metadata, Vue file color/icon defaults if needed, and relationships from Vue files to imports used in `<script>` or `<script setup>`.

Useful because it gives CodeGraphy honest Vue support quickly. Limited because it treats Vue as an SFC import source and does not capture the component map shown in the Nuxt screenshot.

### Option B: Vue Component Relationships

Option A plus a Vue-specific **Edge Type** and **Relationships**:

- `codegraphy.vue:component-usage`
- relationships from a Vue SFC file node to imported Vue SFC file nodes used in its template

Useful because it turns template usage into a readable Relationship Graph without duplicating graph nodes for files that already exist. Riskier because component-name resolution needs clear rules for local imports, auto-imports, aliases, and unresolved names.

### Option C: Nuxt Structure Graph

Vue component relationships plus Nuxt-aware node types and filters inspired by the screenshot:

- Page
- Layout
- Workspace Component
- Global Component
- Library Component
- Unknown Component
- Nuxt-generated and build-output filters such as `.nuxt/`, `.output/`, and `node_modules/`

Resolved out of scope for this card. Nuxt conventions are not the same thing as Vue conventions, and a later Nuxt-specific plugin can own pages, layouts, global components, Nuxt build artifacts, and Nuxt module semantics.

## Resolved Decisions

1. Resolved: this is a Vue plugin first. Nuxt-specific structure is out of scope for the first PR.
2. Resolved: `.vue` files stay File Nodes by default. Vue-specific value comes from SFC parsing and, if needed, styling/icon metadata. Do not create duplicate component Plugin Nodes.
3. Resolved: baseline `.vue` parsing is the first PR. Skip custom Vue component Edge Types for now.
4. Resolved: `examples/example-vue` should be a Vue 3 + Vite fixture that demonstrates script setup, normal script, TypeScript, explicit `.vue` imports, composables, and type imports.
5. Resolved direction: `.vue` script parsing should be owned by the Vue plugin. Shared JS/TS import extraction may be factored locally or shared later, but the SFC block model is Vue-owned.

## Deferred Questions

1. Should a later Vue or Nuxt plugin add component-usage edges after baseline SFC import parsing works?
2. Should library/global/unknown components appear as graph nodes by default, or only after a Graph Scope toggle is enabled?
3. Does the plugin need a new Trello label and package-area docs update, or is the current `Vue Plugin` label enough?

## Recommendation To Test First

Start with Option A as the first PR target: baseline Vue SFC script parsing. Keep Nuxt structure and custom component relationships out of this card unless a later Vue or Nuxt plugin card deliberately owns those conventions.

The first implementation should prove one crisp behavior with tests before production edits: a `.vue` file with normal `<script>`, `<script lang="ts">`, and `<script setup lang="ts">` imports contributes ordinary `import` and `type-import` relationships like comparable TypeScript files.

## Grill Question 1

Should this card's first PR support **Vue SFC Graph** behavior, or should it explicitly support **Nuxt Structure Graph** behavior too?

Recommended answer: ship Vue SFC Graph first, with the example showing a Vue/Vite workspace and a written follow-up for Nuxt pages/layouts/global components. That keeps the first plugin useful while avoiding a muddled Vue-vs-Nuxt contract.

Resolved answer: Vue first. This is a Vue plugin; Nuxt-specific behavior belongs in a possible future Nuxt plugin.

## Grill Question 2

Should Vue components be represented as **Plugin Nodes**, **Symbols**, or only file-to-file **Relationships**?

Recommended answer: keep `.vue` files as ordinary File Nodes and emit ordinary file-to-file **Relationships** from SFC script imports. A component is a framework concept that may deserve richer representation later, but duplicating every SFC as both a file and component node would muddy the baseline graph before the parser exists.

Resolved answer: keep `.vue` files as ordinary File Nodes by default. Use Vue file styling for color/icon treatment only if Material Theme fallback is not already enough. Do not create duplicate component Plugin Nodes for the same files in the first PR.

## Grill Question 3

Should this PR represent Vue support as a Vue-specific File Node Type, or keep `.vue` files as `file` nodes with plugin/default Legend styling?

Recommended answer: keep `.vue` nodes as `file` and style them through plugin `fileColors` plus Material Theme icon fallback when available. A Vue-specific node type would buy a Graph Scope row for Vue files, but it would also split file behavior away from the normal File Node contract. Use Graph Scope for the Vue component relationship edge instead.

## Parser Notes

The plugin must parse Vue SFC script blocks rather than handing the entire `.vue` file to the current TypeScript/JavaScript Tree-sitter path. Vue SFCs are a custom HTML-like file format with top-level `<template>`, `<script>`, `<script setup>`, `<style>`, and custom blocks. Vue 3 supports both normal `<script>` and `<script setup>` in limited combinations, plus `lang="ts"` and newer attributes such as `generic` on `<script setup>`.

Use `@vue/compiler-sfc` as the first-pass parser. It is the official Vue SFC compiler package and can parse the SFC descriptor without betting on an old Vue Tree-sitter grammar. `vue-eslint-parser` remains a candidate if we later need richer template AST services, but it brings ESLint-shaped AST concepts. `tree-sitter-vue` exists, but the npm package is old and should not be the foundation for Vue 3 coverage.

Candidate implementation direction:

- Extract `<script>` and `<script setup>` blocks from `.vue` files.
- Parse those extracted blocks with TypeScript-compatible import/specifier extraction, using the same relationship semantics as JS/TS where possible.
- Resolve relative imports from `.vue` files, including explicit child paths such as `./Child.vue`.
- Emit plain JS/TS import/type-import relations where appropriate so `.vue` script dependencies show up like normal TypeScript connections.
- Prefer import/type-import correctness as the baseline. Emit a custom Vue component edge only if the implementation can confidently connect a template tag to an imported component binding.
- Keep unresolved, library, auto-import, and global component behavior out of the first pass unless the next grill decision pulls one in.

## Analyzer Options Considered

- `@vue/compiler-sfc`: recommended first-pass dependency. Best fit for robust SFC block parsing across Vue 3 syntax, including normal script, script setup, TypeScript script blocks, and custom blocks.
- `vue-eslint-parser`: strong option for template-aware component usage analysis because it understands Vue templates and scripts together. Consider it if `@vue/compiler-sfc` plus simple template inspection is not enough.
- `tree-sitter-vue`: not recommended as the primary parser. It exists, but the package appears stale compared with current Vue 3 SFC features.

## Edge Type Decision

Two viable choices:

- No custom Vue edge in the first pass: parse `.vue` scripts correctly and emit ordinary `import` / `type-import` relationships. This is the highest-confidence baseline and immediately fixes missing TS connections.
- Add a custom Vue component edge: emit `codegraphy.vue:component` or `codegraphy.vue:component-usage` only when an imported component binding is actually used as a template component. This adds a useful Graph Scope row but requires template-to-import binding resolution.

Resolved answer: first PR should guarantee `.vue` script import parsing and skip custom Vue component edges. The plugin can revisit component-specific relationships after the baseline SFC import graph is real and visually inspected.

## Visual Inspection Plan

Create a small `examples/example-vue` workspace before implementing the plugin, open it in the current extension, and capture a Graph View screenshot. This answers what CodeGraphy already does for `.vue` file colors/icons through Core Material Theme fallback and what the Vue plugin actually needs to add.

The fixture should include:

- `src/App.vue` with `<script setup lang="ts">`
- a component with normal `<script lang="ts">`
- explicit `.vue` imports
- explicit `.vue` component imports
- composable and type imports from `.ts` files
- enough connected `.ts` files to show whether current CodeGraphy indexes only TypeScript files before the Vue plugin exists

## Visual Inspection Result

Baseline fixture created at `examples/example-vue`.

Current behavior before the Vue plugin:

- Core indexing sees the `.vue` files as File Nodes.
- The rendered Graph View shows `.vue` nodes with green Vue icon styling through the existing Material Theme fallback.
- The graph shows `14 nodes • 1 connection` in VS Code.
- Graph Query reports four `.vue` File Nodes: `src/App.vue`, `src/components/CounterPanel.vue`, `src/components/StatusBadge.vue`, and `src/components/UserCard.vue`.
- Graph Query reports only one Vue-related edge: `src/main.ts -> src/App.vue` as a normal import.
- Imports inside `.vue` blocks are missing from the graph.

Screenshot artifact:

- `examples/assets/graphs/vue-baseline.png`

Conclusion: the Vue plugin does not need to add a Vue node type and probably does not need default Vue color/icon styling for the Material Theme path. The first plugin behavior should focus on parsing `.vue` SFC script blocks with `@vue/compiler-sfc`, then emitting ordinary import and type-import relationships.
