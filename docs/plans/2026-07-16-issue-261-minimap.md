# Relationship Graph minimap plan

Discussion plan for [Trello card 261](https://trello.com/c/gLFVYxX6/261-minimap).

## Outcome

Add an optional minimap to the bottom-left corner of the Relationship Graph. It shows the entire current Visible Graph with a stable fitted view, preserves the nodes' current positions, sizes, shapes, and colors, and overlays a viewport box that tracks the main camera. Clicking or dragging in the minimap pans the main camera without changing its zoom.

The minimap is a navigation aid, not a second interactive graph. It does not run physics, independently zoom or pan, show labels or edges, accept node selection, or change the graph camera when the minimap's own bounds are recomputed.

## Proposed experience

- Place a compact, fixed-size panel in the bottom-left of the graph viewport, inset from the edges and above any existing controls.
- Fit the complete Visible Graph into that panel with a constant padding ratio. The minimap projection changes only when graph bounds, panel dimensions, or node visual sizes change.
- Draw each node at its live graph position using the same resolved fill color, opacity, shape, and relative visual size as the main graph. Clamp the smallest rendered radius so dense graphs remain legible.
- Draw no labels, hover effects, particles, decorations, or edges in the first version. Nodes and the viewport box are enough for orientation and avoid a large rendering multiplier on dense graphs.
- Draw a high-contrast, translucent viewport box for the main camera. Panning moves the box; zooming changes its size around the camera center.
- Clicking an empty minimap location centers the main camera there. Pointer-dragging continuously centers the camera beneath the pointer while retaining the current main-camera zoom.
- Capture the pointer during a minimap drag so navigation remains continuous when the pointer briefly leaves the panel. `Escape` or pointer cancellation ends the drag.
- Prevent minimap gestures from selecting nodes, opening graph context menus, panning the main canvas directly, or starting marquee selection.
- Hide the minimap when the Visible Graph has no positioned nodes. If only some nodes lack finite positions during layout startup, fit and draw the positioned subset and incorporate the rest as their positions become available.
- Add a **Show minimap** switch to Settings > Display. Persist it as a CodeGraphy Workspace setting and default it to on for discussion; see the open question below.

## Fixed-view semantics

"Fixed" means the minimap panel and its projection are independent of the main camera:

- The panel stays anchored to the same screen-space corner and keeps the same dimensions.
- Its graph-to-minimap scale always fits the full current graph bounds plus border padding.
- Main-camera pan and zoom update only the viewport box.
- Layout movement or a Visible Graph change may update the fitted graph bounds because the graph itself changed.
- A bounds change must not pan or zoom the main camera.

The viewport box comes from the main camera's graph-space rectangle:

```text
halfWidth  = mainViewportWidth  / (2 * camera.zoom)
halfHeight = mainViewportHeight / (2 * camera.zoom)

left   = camera.centerX - halfWidth
right  = camera.centerX + halfWidth
top    = camera.centerY - halfHeight
bottom = camera.centerY + halfHeight
```

Project those four graph-space bounds through the minimap's fixed fit transform. Clip the result to the minimap panel, while retaining a visible indication when the main camera is completely outside the graph bounds.

## Architecture recommendation

Implement the minimap as a feature owned by the current 2D graph surface, sharing its render loop, layout, resolved appearance, and camera. Do not mount a second graph component and do not mirror per-frame positions into React or the global store.

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
  drawing.ts          fixed-screen panel, nodes, and viewport box
  interaction.ts      hit testing, pointer capture, and camera centering
  model.ts            cached bounds/projection and configuration contracts
```

Each source module should have a matching test module in the corresponding extension test path.

### Rendering integration

Extend the owned frame drawing stage with a fixed-screen pass after the main graph transform is restored. That pass should:

1. Return immediately when the setting is off or no finite node positions exist.
2. Recompute graph bounds only when the position version, style revision, node collection, or panel size changes.
3. Compute one fixed fit transform from those bounds and the panel rectangle.
4. Clip to the rounded panel rectangle.
5. Draw the background/border, then nodes in the existing stable stacking order, then the viewport box.
6. Restore the canvas state before plugin post-frame overlays continue.

The minimap should use the existing overlay canvas rather than allocate a second WebGPU renderer, physics engine, animation loop, or full-resolution offscreen canvas. Its nodes are simple 2D primitives derived from resolved node styles. This keeps the added work proportional to visible node count and avoids GPU resource duplication.

Plugin post-frame overlays should retain their current graph-space contract. The minimap's screen-space pass must be isolated so it cannot alter the transform or clipping observed by plugins.

### Camera and interaction integration

Minimap pointer handling belongs in the owned surface interaction runtime because that runtime already arbitrates graph pan, node drag, context gestures, and hover.

- Hit-test the minimap rectangle before graph node/link picking.
- On primary-button down inside the panel, enter a dedicated minimap gesture and capture the pointer.
- Convert the pointer's panel coordinates through the inverse fixed fit transform.
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

- Read live node positions and the camera directly in the owned render frame.
- Redraw as part of a frame the main surface already requested. Minimap interaction may request a frame, but it must not start a separate perpetual loop.
- Cache graph bounds and the fixed fit transform. Invalidate them on `positionVersionRef`, node collection, node-style revision, or panel-size changes.
- Camera-only changes reuse the cached bounds and redraw only the viewport box as part of the normal frame.
- Reuse the renderer's stable node stacking order and resolved node styles.
- Avoid allocating arrays, maps, path objects, or React objects in the steady-state frame path.
- Keep edge rendering out of the first version. If later usability testing shows edges are necessary, add a density-aware sampled or rasterized mode rather than drawing every edge unconditionally.

Proposed acceptance budgets for representative development fixtures:

- No additional animation frames while the graph and camera are idle.
- No second physics simulation or graph renderer.
- At most one graph-bounds scan per position/style revision, not per camera frame.
- Minimap navigation should update on the next animation frame while dragging.
- The existing performance monitor should include minimap drawing time because it occurs inside the owned frame.

Before implementation, record main-renderer frame cost with the minimap disabled and enabled on small, medium, and dense graphs. Treat a sustained regression above 1 ms per frame or 10% of the existing render cost, whichever is larger, as a prompt to add density reduction before release rather than as an automatic acceptance threshold.

## Test plan

Follow Red -> Green -> Refactor. The human-owned acceptance Gherkin must not be changed unless explicitly approved.

### Unit and component coverage

- Projection fits wide, tall, single-point, negative-coordinate, and partially unpositioned graphs with stable padding.
- Projection and inverse projection round-trip within a small tolerance.
- Viewport box position follows camera pan and size follows camera zoom.
- Bounds invalidation responds to position, style, collection, and panel-size revisions but not camera-only changes.
- Drawing uses resolved node fill, opacity, shape, and relative dimensions; it omits labels, edges, particles, and decorations.
- Drawing clips nodes and the viewport box to the panel and restores canvas state.
- Click and drag center the camera in graph coordinates without changing zoom.
- Minimap gestures take precedence over graph picking, selection, marquee, hover, and context-menu behavior.
- Disabled settings and empty graphs do not draw or intercept input.
- The Display switch updates local state, posts the protocol message, and hydrates from persisted settings.
- Persisted settings tolerate older workspaces where `showMinimap` is absent by applying the default.

### Integration and browser coverage

- The viewport box changes after toolbar/wheel zoom and graph pan.
- Dragging across the minimap moves the visible graph continuously and preserves zoom.
- Graph-data updates add, remove, recolor, resize, and reposition minimap nodes without remounting a second graph runtime.
- The minimap remains anchored after webview resize and recomputes its fit.
- Bottom-left layout does not overlap Depth View controls, loading/error overlays, plugin UI slots, or accessibility controls at supported viewport sizes.
- Keyboard and screen-reader traversal are unaffected; the canvas minimap has an accessible name or an adjacent description if it becomes keyboard-operable.

Run the targeted minimap tests during development, then the repository quality gates: full tests, lint, typecheck, CRAP, and mutation testing for each new minimap source module.

## Delivery sequence

1. Add failing projection and camera-viewport tests, then implement the pure minimap model.
2. Add failing drawing tests, then integrate a fixed-screen minimap pass with cached bounds and shared node styles.
3. Add failing gesture tests, then integrate minimap click/drag with camera and pointer arbitration.
4. Add failing persistence/protocol/UI tests, then add the Display switch and workspace setting.
5. Add browser coverage for pan, zoom, resize, and graph updates.
6. Profile representative graph sizes, refine density behavior if needed, and run all quality gates.
7. Add an extension changeset describing the optional Relationship Graph minimap.

## Risks and mitigations

- **Dense-graph frame cost:** drawing every node adds CPU canvas work. Keep the first version node-only, cache projection inputs, avoid steady-state allocation, and profile before release.
- **Layout bounds churn:** live physics can continuously expand or contract bounds, making the minimap appear to breathe. Cache by position revision and consider a small hysteresis or settle-only bounds policy if profiling/usability testing shows visible instability.
- **Gesture conflicts:** the minimap shares the overlay canvas with graph interaction. Give its rectangle first refusal and model its drag as an explicit pointer session.
- **Color fidelity:** node appearance includes theme, legend, custom rule, decoration, hover, and selection effects. Use the resolved base node style, but intentionally omit transient hover/selection and plugin decorations unless product discussion chooses otherwise.
- **Very large viewport box:** when the main camera is zoomed far out, its viewport can exceed minimap bounds. Clip the box and keep a minimum visible stroke.
- **Camera outside graph bounds:** show the clipped box or a directional edge indicator rather than silently disappearing. Exact treatment needs a small visual prototype.
- **Control overlap:** bottom-left currently participates in graph overlays and plugin UI. Establish a shared corner-control layout or reserved inset instead of relying on an isolated hard-coded offset.

## Open decisions for the PR discussion

1. Should **Show minimap** default to on for existing and new workspaces, or default off until users opt in? Recommendation: on, because it is discoverable and immediately useful, with the persisted switch providing escape.
2. Should the minimap show the full Visible Graph or the pre-search Filtered Graph? Recommendation: the current Visible Graph so it always matches what the user can navigate to on the main canvas.
3. Should nodes include transient selection, favorite, hover, and plugin decoration treatments? Recommendation: use resolved base size/shape/color and omit transient/decorative overlays in version one.
4. Should the viewport box be allowed to leave the minimap entirely when the camera moves outside graph bounds? Recommendation: clip it and show a subtle directional indicator so camera location is never ambiguous.
5. Should clicking animate the main camera or move immediately? Recommendation: immediate movement during drag and a short existing-style camera transition for a standalone click, provided the transition does not make click-then-drag feel delayed.
6. What fixed dimensions and small-screen behavior should ship? Recommendation: start near 180 x 120 CSS pixels, shrink at narrow widths, and auto-hide only when it would collide with primary controls.
7. Do we want edges later? Recommendation: validate node-only orientation first; treat edges as a separate follow-up with an explicit density/performance design.

## Explicitly out of scope

- 3D minimap behavior.
- Independent minimap pan or zoom.
- Node selection, hover tooltips, context menus, or file opening from the minimap.
- Labels, edges, particles, plugin overlays, and graph decorations in the minimap.
- A public Plugin API for minimap rendering.
- Saving minimap dimensions or corner position.
- Editing human-owned acceptance feature files without separate approval.
