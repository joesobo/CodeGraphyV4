# Zoom Controls

## Trello

- https://trello.com/c/HYtqNB0L/126-zoom-controls-dont-work-in-3d
- https://trello.com/c/bvOwTcSX/127-zoom-controls-should-allow-holding-to-continuously-zoom

## Settled Behavior

- Primary scope: Graph View UI zoom controls.
- Secondary scope: keyboard zoom where it already maps to zoom behavior.
- 2D zoom changes rendered graph scale.
- 3D zoom changes camera distance while preserving current camera direction and target.
- Holding a zoom control performs one zoom step immediately, then repeats after a short delay until release, cancel, pointer leave, or window blur.
- Continuous zoom uses the same zoom factor as repeated single zoom actions: `1.2` for zoom in and `1 / 1.2` for zoom out.
- 3D zoom distance should be clamped relative to the current graph context.
- Switching between 2D and 3D should keep current behavior; switching into 3D may still fit the graph when the graph ref is ready.

## Implementation Notes

- Start with failing tests for the current 3D no-op and missing hold-to-repeat behavior.
- Replace the 2D-only zoom effect path with a mode-aware Graph View Zoom action.
- Keep the corner controls as the main hold-to-repeat surface.
- Let keyboard repeat keep working through repeated key events rather than adding a separate keyboard timer.
- No ADR needed: this is interaction semantics, not a hard-to-reverse architecture decision.
