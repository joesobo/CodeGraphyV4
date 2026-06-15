# Trello 200: Graph Background Particle Effects Plan

Trello card: https://trello.com/c/TJgL2Yzq/200-design-a-graph-background-particle-effects-plugin
Stacked base PR: https://github.com/joesobo/CodeGraphyV4/pull/266

## Product Boundary

This PR adds animated graph-background effects as plugin-owned graph ambience,
not as more CSS snippets. CSS snippets remain the static styling route for
grids, images, and theme surface polish. Runtime particles need a renderer that
can respect graph interaction, reduced motion, and user toggles.

Existing CodeGraphy "particles" settings control directional edge particles in
the **Graph View** renderer. This card is separate: background effects should
render behind the **Relationship Graph** on the **Graph Stage** without changing
graph data, **Graph Scope**, **Legend Entries**, or edge animation settings.

## Target Experience

Users enable the graph background effects plugin, open the Theme popup, and
toggle a small plugin-injected set of canvas presets such as synapse, rain,
constellations, perlin flow, leaves, sparkles, or embers.
Only one background preset should be active at first unless implementation
proves that layering is cheap and understandable.

Effects should use real canvas rendering instead of earlier fake CSS
pseudo-particles.

## Implementation Questions

- Prefer a small canvas renderer unless `tsParticles` clearly reduces code and
  bundle risk for this narrow surface.
- Store effect state as workspace-local settings, likely a simple preset id or
  selected custom effect id plus disabled state that mirrors the CSS snippet
  toggle simplicity.
- Keep the extension generic: it exposes plugin data and Graph View slots, while
  the particles plugin owns the Theme popup section, canvas renderer, presets,
  and stored particle settings.
- Ship this as a first-party bundled plugin that exercises plugin-owned Graph
  View UI instead of adding a particle subsystem to the extension.

## Planned Slices

1. Write failing webview tests for rendering a background-effect layer behind
   the graph without blocking graph interaction.
2. Write failing plugin-data tests for persisting and broadcasting plugin-owned
   effect state.
3. Implement the smallest generic plugin-data and slot plumbing needed to render
   background effects safely.
4. Add demo presets and plugin-injected Theme popup toggles
   for validation.
5. Update docs and add a user-facing changeset once behavior exists.
6. Verify with focused unit/webview tests, then run the relevant extension
   checks and visual validation.
