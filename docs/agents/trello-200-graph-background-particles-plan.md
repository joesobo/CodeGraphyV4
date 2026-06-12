# Trello 200: Graph Background Particle Effects Plan

Trello card: https://trello.com/c/TJgL2Yzq/200-design-a-graph-background-particle-effects-plugin
Stacked base PR: https://github.com/joesobo/CodeGraphyV4/pull/266

## Product Boundary

This PR adds animated graph-background effects as plugin-owned graph ambience,
not as more CSS snippets. CSS snippets remain the static styling route for
grids, images, and theme surface polish. Runtime particles need a renderer that
can respect graph interaction, reduced motion, intensity limits, and user
toggles.

Existing CodeGraphy "particles" settings control directional edge particles in
the **Graph View** renderer. This card is separate: background effects should
render behind the **Relationship Graph** on the **Graph Stage** without changing
graph data, **Graph Scope**, **Legend Entries**, or edge animation settings.

## Target Experience

Users enable the graph background effects plugin, open the Theme popup, and
toggle a small set of Odysseus canvas presets such as synapse, rain,
constellations, perlin flow, leaves, sparkles, or embers.
Only one background preset should be active at first unless implementation
proves that layering is cheap and understandable.

Effects should match Odysseus' open-source canvas routines closely instead of
the earlier fake CSS
pseudo-particles.

## Implementation Questions

- Prefer a small canvas renderer unless `tsParticles` clearly reduces code and
  bundle risk for this narrow surface.
- Store effect state as workspace-local settings, likely a simple preset id plus
  enabled map or disabled state that mirrors the CSS snippet toggle simplicity.
- Keep the Theme popup extension small: one particle effects section with
  toggles, reduced-motion behavior, and an intensity/performance control if the
  renderer needs one.
- Decide whether this is a first-party bundled plugin or an example plugin that
  exercises a new graph-background contribution point.

## Planned Slices

1. Write failing webview tests for rendering a background-effect layer behind
   the graph without blocking graph interaction.
2. Write failing settings/protocol tests for persisting and broadcasting the
   selected effect state.
3. Implement the smallest contribution point or first-party plugin path needed
   to render background effects safely.
4. Add Odysseus-inspired demo presets and Theme popup toggles for validation.
5. Add reduced-motion and intensity behavior before broader visual polish.
6. Update docs and add a user-facing changeset once behavior exists.
7. Verify with focused unit/webview tests, then run the relevant extension
   checks and visual validation.
