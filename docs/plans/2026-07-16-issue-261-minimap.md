# Relationship Graph minimap plan

Discussion plan for [Trello card 261](https://trello.com/c/gLFVYxX6/261-minimap).

## Outcome

Add an optional minimap to the bottom-left corner of the Relationship Graph. It shows the entire current Visible Graph with a stable fitted view, preserves the nodes' current positions, sizes, shapes, and colors, and overlays a viewport box that tracks the main camera. Clicking or dragging in the minimap pans the main camera without changing its zoom.

The minimap is a navigation aid, not a second interactive graph. It does not run physics, independently zoom or pan, show labels or enhanced edge treatments, accept node selection, or change the graph camera when the minimap's own bounds are recomputed.

## Proposed experience

- Place a compact, fixed-size square panel in the bottom-left of the graph viewport, inset from the edges and above any existing controls.
- Give the square a clearly visible theme-aware border and contrasting background treatment so its boundary remains identifiable over every graph background. The viewport box must remain visually distinct from this outer border.
- Fit the complete Visible Graph into the square with a uniform scale, preserve its aspect ratio, center it, and reserve consistent internal padding on every side for breathing room. The minimap projection changes only when graph bounds, panel dimensions, or node visual sizes change.
- Draw each node at its live graph position using the same resolved fill color, opacity, shape, and relative visual size as the main graph. Clamp the smallest rendered radius so dense graphs remain legible.
- Draw base edges and nodes in the minimap. Omit labels, hover and selection effects, particles, and decorations. Plugin-owned visual effects are excluded unless their owning plugin later adds explicit minimap support.
- Draw a high-contrast, translucent viewport box for the main camera. Panning moves the box; zooming changes its size around the camera center.
- Clicking outside the viewport box centers the main camera at that minimap location. Dragging from outside the box continues centering the camera beneath the pointer. Dragging the viewport box preserves the pointer's initial grab offset so the camera does not jump when the drag begins. All navigation retains the current main-camera zoom.
- Capture the pointer during a minimap drag so navigation remains continuous when the pointer briefly leaves the panel. `Escape` or pointer cancellation ends the drag.
- Make the minimap keyboard-focusable. Arrow keys pan by one tenth of the visible graph area; `Shift` + Arrow pans five times farther.
- Use grab and grabbing cursor feedback for pointer navigation.
- Prevent minimap gestures from selecting nodes, opening graph context menus, panning the main canvas directly, or starting marquee selection.
- Hide the minimap when the Visible Graph has no positioned nodes. If only some nodes lack finite positions during layout startup, fit and draw the positioned subset and incorporate the rest as their positions become available.
- Add a **Show minimap** switch to Settings > Display. Persist it as a CodeGraphy Workspace setting and default it to on for discussion; see the open question below.

## Fixed-view semantics

"Fixed" means the minimap panel and its projection are independent of the main camera:

- The panel stays anchored to the same screen-space corner and keeps the same dimensions.
- Its graph-to-minimap scale always fits the full current graph bounds inside an inner padded rectangle. The outer panel border is not part of this breathing room.
- Wide and tall graphs are centered along the unused axis; they are never stretched to fill the square.
- Main-camera pan and zoom update only the viewport box.
- Initial layout movement may update the fitted graph bounds until the layout settles. The settled projection then stays fixed while position-only updates repaint nodes and edges, so manually dragging a node far away cannot permanently zoom the minimap out.
- A Visible Graph membership change, panel-size change, or base node-size/style change recomputes the fitted projection. Position-only changes do not.
- A bounds change must not pan or zoom the main camera.
- While the initial or newly invalidated fit is active, fitted bounds are expand-only so the minimap does not repeatedly zoom in and out as the layout moves. When physics settles, perform one final tight fit around the settled graph with the same internal padding and lock that projection.

The viewport box comes from the main camera's graph-space rectangle:

```text
halfWidth  = mainViewportWidth  / (2 * camera.zoom)
halfHeight = mainViewportHeight / (2 * camera.zoom)

left   = camera.centerX - halfWidth
right  = camera.centerX + halfWidth
top    = camera.centerY - halfHeight
bottom = camera.centerY + halfHeight
```

Project those four graph-space bounds through the minimap's fixed fit transform. Do not constrain the main camera to the fitted graph area. Clip the viewport box to the minimap square; when it is completely outside, draw a small directional indicator at the nearest inner edge so the camera's direction remains visible without drawing beyond the outer border.

## Architecture recommendation

Implement the minimap as a feature owned by the current 2D graph surface, sharing its layout, resolved appearance, camera, WebGPU device, pipelines, and packed graph buffers. The extension owns a retained square WebGPU canvas for the minimap panel and registers it as a secondary surface on the existing renderer. Do not mount a second graph component, create a second renderer or physics simulation, or mirror per-frame positions into React or the global store.

The existing owned surface already has the necessary authoritative data:

- `OwnedGraphLayout.nodes` contains the live positions updated by physics.
- `Surface2dProps.getNodeStyle` resolves the same node colors, shapes, opacity, and visual dimensions used by the main renderer.
- `OwnedGraphCamera` owns `centerX`, `centerY`, and `zoom`.
- The prepared overlay canvas knows the main viewport's CSS-pixel width and height.
- `positionVersionRef` identifies layout-position changes, and `getStyleRevision()` identifies appearance changes.
- The surface pointer runtime already owns gesture arbitration and camera updates.

Add a feature-first `minimap/` area beneath the owned 2D surface. Keep the responsibilities split by mutation site:

```text
components/graph/rendering/surface/owned2d/minimap/
  projection.ts       graph bounds and graph/minimap coordinate transforms
  presentation.ts     retained secondary canvas and viewport box presentation
  interaction.ts      hit testing, pointer capture, and camera centering
  scheduling.ts       dirty state, capped refresh, and settled refresh policy
  model.ts            projection and feature configuration contracts
```

Each source module should have a matching test module in the corresponding extension test path.

### Rendering integration

The extension owns minimap behavior, DOM placement, retained canvas, and refresh policy. The graph renderer owns a narrow secondary-surface operation that renders the already-packed base graph into that small WebGPU canvas. This operation reuses the current device, node and edge buffers, base rendering pipelines, queue, and synchronized live positions. It must not own settings, interaction, refresh timing, panel presentation, or camera-navigation policy.

The square secondary render target uses its own fixed fit camera and draws:

- base edge strokes, reusing the existing edge geometry and buffers with their resolved base color, opacity, and width;
- base nodes, using their resolved fill color, opacity, shape, and relative size;
- no arrowheads or other direction indicators, labels, hover or selection treatments, particles, relationship decorations, or plugin overlays.

The renderer should not rebuild, resample, or create minimap-specific edge data. Its secondary pass reuses the current edge buffers and selects only the base edge-stroke layer. Optional presentation layers such as arrowheads and particles are skipped through render-pass configuration.

The extension places the retained secondary canvas in a fixed screen-space panel and draws the live main-camera viewport box above it on a separate retained overlay. Main-camera pan and zoom update only the inexpensive viewport overlay and never request a secondary base-graph pass. The browser compositor keeps the last secondary-canvas image visible between refreshes.

The minimap presentation pass should:

1. Return immediately when the setting is off or no finite node positions exist.
2. Recompute graph bounds and the fixed fit camera only when the cached minimap scene is refreshed or the panel size changes.
3. Ask the renderer to update the retained secondary canvas only when the minimap scheduler marks the scene dirty and permits a refresh.
4. Leave the last presented secondary-canvas image untouched between refreshes.
5. Draw the theme-aware outer border and the live viewport box in the extension-owned presentation layer, using distinguishable colors and/or line styles.
6. Restore rendering state before plugin post-frame overlays continue.

The minimap should allocate only a minimap-sized secondary surface and its camera resources, not a second renderer, physics engine, animation loop, graph model, duplicated graph buffers, or full-resolution offscreen canvas. The surface should be disposed or remain unallocated while the minimap is disabled. Because base edges and nodes reuse existing GPU buffers, a refresh adds a small render pass without repacking or uploading the graph again.

When both primary and secondary work occur in the same frame, encode their passes into one command encoder and one queue submission. Secondary work must use the graph buffers after primary synchronization. Omitting a secondary refresh must create no secondary render pass.

Plugin post-frame overlays should retain their current graph-space contract. The minimap's screen-space pass must be isolated so it cannot alter the transform or clipping observed by plugins.

### Camera and interaction integration

Minimap pointer handling belongs in the owned surface interaction runtime because that runtime already arbitrates graph pan, node drag, context gestures, and hover.

- Hit-test the minimap rectangle before graph node/link picking.
- On primary-button down inside the panel, enter a dedicated minimap gesture and capture the pointer.
- Convert the pointer's panel coordinates through the inverse fixed fit transform.
- If the pointer starts inside the viewport box, store its graph-space offset from the camera center and preserve that offset throughout the drag.
- If the pointer starts outside the viewport box, center the camera beneath the pointer immediately and continue doing so throughout the drag.
- Update `camera.centerX` and `camera.centerY`, cancel any active camera transition, and request a frame.
- Preserve `camera.zoom` for both click and drag.
- Suppress node/link hover and tooltip state while the minimap gesture is active.
- Release the gesture on pointer up, pointer cancel, loss of capture, or `Escape`.
- Ignore secondary-button and multi-button gestures in the first version.

The viewport box and navigation math should use CSS pixels, not device-pixel backing-store coordinates, matching the existing prepared overlay dimensions.

### Settings integration

Add `showMinimap: boolean` through the existing settings path:

- repository defaults and persisted-shape allowlist;
- settings snapshot and extension/webview protocols;
- webview store state, bootstrap/message handling, and display actions;
- Settings > Display switch;
- graph surface props consumed by the minimap renderer.

This is a user-facing behavior change, so implementation requires an extension changeset. It should not change the Plugin API unless later discussion decides plugins need minimap contributions.

## Update and performance policy

The minimap must remain synchronized without turning React state or extension messages into a per-frame channel.

- Read live positions and the main camera directly from the owned surface runtime.
- Maintain a retained, minimap-sized WebGPU canvas containing the complete base graph.
- Mark that secondary surface dirty when positions, graph membership, base edge/node styles, visibility, or panel size change.
- While physics is active, refresh the secondary surface at a capped cadence rather than at the main graph frame rate. Start with 8 Hz as a tunable target, then profile representative graphs before fixing the shipped value.
- When physics settles, perform one final refresh so the cached minimap exactly matches the settled layout.
- Graph and style mutations outside active physics request one refresh.
- Main-camera pan and zoom never refresh the secondary surface; they update only the viewport box.
- Hidden minimaps allocate no target and perform no refresh work.
- Failure to register the optional secondary WebGPU target hides only the minimap and leaves the primary Relationship Graph operational.
- Reuse existing packed node and edge buffers and base pipelines; do not repack graph data for each refresh.
- Avoid allocations in both steady-state composition and capped-refresh paths.

Proposed acceptance budgets for representative development fixtures:

- No additional animation frames while the graph and camera are idle.
- No second physics simulation, graph model, renderer instance, or duplicated graph buffers.
- At most the configured capped minimap refresh rate while physics is active, plus one final settled refresh.
- Minimap navigation should update on the next animation frame while dragging.
- Main-camera-only frames should pay only for cached-texture composition and the viewport-box overlay.
- The existing performance monitor should report secondary-target refresh cost separately from steady-state minimap composition cost.

Before implementation, record main-renderer frame cost with the minimap disabled and enabled on small, medium, and dense graphs. Treat a sustained regression above 1 ms per frame or 10% of the existing render cost, whichever is larger, as a prompt to add density reduction before release rather than as an automatic acceptance threshold.

## Test plan

Follow Red -> Green -> Refactor. The human-owned acceptance Gherkin must not be changed unless explicitly approved.

### Unit and component coverage

- Projection fits wide, tall, single-point, negative-coordinate, and partially unpositioned graphs with stable padding.
- Projection and inverse projection round-trip within a small tolerance.
- Viewport box position follows camera pan and size follows camera zoom.
- Bounds invalidation responds to position, style, collection, and panel-size revisions but not camera-only changes.
- The secondary target reuses base edge-stroke and node data while omitting arrowheads, direction indicators, labels, transient effects, particles, relationship decorations, and plugin overlays.
- The panel is square and its outer border remains distinguishable from both the graph background and the viewport box.
- Presentation clips the cached texture and viewport box to the panel and restores rendering state.
- Active physics refreshes no faster than the configured cap and always schedules a final settled refresh.
- Active-physics projection bounds expand but do not contract; the settled refresh tightens them once while preserving uniform internal padding.
- Camera-only movement does not invalidate or rerender the retained secondary canvas.
- Click and drag center the camera in graph coordinates without changing zoom.
- Viewport-box dragging preserves the initial grab offset, while interaction outside the box recenters beneath the pointer.
- Minimap gestures take precedence over graph picking, selection, marquee, hover, and context-menu behavior.
- Disabled settings and empty graphs do not draw or intercept input.
- The Display switch updates local state, posts the protocol message, and hydrates from persisted settings.
- Persisted settings tolerate older workspaces where `showMinimap` is absent by applying the default.

### Integration and browser coverage

- The viewport box changes after toolbar/wheel zoom and graph pan.
- Dragging across the minimap moves the visible graph continuously and preserves zoom.
- A browser-level regression compares the viewport box with the debug camera while panning, resizing, and changing Visible Graph membership.
- Graph-data updates add, remove, recolor, resize, and reposition minimap nodes without remounting a second graph runtime.
- The minimap remains anchored after webview resize and recomputes its fit.
- Bottom-left layout does not overlap Depth View controls, loading/error overlays, plugin UI slots, or accessibility controls at supported viewport sizes.
- Keyboard and screen-reader traversal are unaffected; the canvas minimap has an accessible name or an adjacent description if it becomes keyboard-operable.

Run the targeted minimap tests during development, then the repository quality gates: full tests, lint, typecheck, CRAP, and mutation testing for each new minimap source module.

## Delivery sequence

1. Add failing projection and camera-viewport tests, then implement the pure minimap model.
2. Add failing renderer tests, then add a narrow secondary-viewport render target that reuses packed base edge and node data.
3. Add failing gesture tests, then integrate minimap click/drag with camera and pointer arbitration.
4. Add failing scheduling tests, then add dirty-state, capped active-physics refresh, and final settled refresh behavior.
5. Add failing persistence/protocol/UI tests, then add the Display switch and workspace setting.
6. Add browser coverage for pan, zoom, resize, and graph updates.
7. Profile representative graph sizes, refine density behavior if needed, and run all quality gates.
8. Add an extension changeset describing the optional Relationship Graph minimap.

## Risks and mitigations

- **Dense-graph refresh cost:** base edges and nodes add an extra GPU pass. Reuse existing buffers and pipelines, render only to a small target, cap active-layout refreshes, and profile refresh cost separately from steady-state composition.
- **Layout bounds churn:** live physics can continuously expand or contract bounds, making the minimap appear to breathe. Cache by position revision and consider a small hysteresis or settle-only bounds policy if profiling/usability testing shows visible instability.
- **Gesture conflicts:** the minimap shares the overlay canvas with graph interaction. Give its rectangle first refusal and model its drag as an explicit pointer session.
- **Color fidelity:** node appearance includes theme, legend, custom rule, decoration, hover, and selection effects. Use the resolved base node style, but intentionally omit transient hover/selection and plugin decorations unless product discussion chooses otherwise.
- **Very large viewport box:** when the main camera is zoomed far out, its viewport can exceed minimap bounds. Clip the box and keep a minimum visible stroke.
- **Camera outside graph bounds:** clip a partially visible viewport box and show a small directional indicator at the nearest inner edge when it is completely outside. Keep both treatments contained by the outer border.
- **Control overlap:** bottom-left currently participates in graph overlays and plugin UI. Establish a shared corner-control layout or reserved inset instead of relying on an isolated hard-coded offset.

## Open decisions for the PR discussion

1. Should **Show minimap** default to on for existing and new workspaces, or default off until users opt in? Recommendation: on, because it is discoverable and immediately useful, with the persisted switch providing escape.
2. **Resolved:** render the current Visible Graph so Graph Scope, filters, search, collapse, and Depth Mode are reflected exactly in the minimap.
3. Should favorites be treated as base node appearance or as a transient/decorative treatment? Current decision: omit hover, selection, plugin decorations, particles, and labels; clarify favorites before implementation.
4. **Resolved:** the camera remains unconstrained; clip a partially visible viewport box and show a subtle nearest-edge directional indicator when it is completely outside.
5. Should clicking animate the main camera or move immediately? Recommendation: immediate movement during drag and a short existing-style camera transition for a standalone click, provided the transition does not make click-then-drag feel delayed.
6. What fixed square dimensions and small-screen behavior should ship? Recommendation: start near 160 x 160 CSS pixels, shrink at narrow widths, and auto-hide only when it would collide with primary controls.

## Explicitly out of scope

- 3D minimap behavior.
- Independent minimap pan or zoom.
- Node selection, hover tooltips, context menus, or file opening from the minimap.
- Arrowheads and other direction indicators, labels, particles, hover and selection effects, plugin overlays, and relationship decorations in the minimap.
- A public Plugin API for minimap rendering.
- Saving minimap dimensions or corner position.
- Editing human-owned acceptance feature files without separate approval.
