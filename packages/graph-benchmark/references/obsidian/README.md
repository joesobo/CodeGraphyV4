# Obsidian graph feel reference

This directory is the A0 reference capture for the seeded CodeGraphy fixture mirrored into Obsidian. Each scenario contains:

- `reference.mp4` — the motion recording;
- `motion-strip.png` — every second frame tiled for quick visual comparison;
- `metrics.json` — RMS world-coordinate displacement sampled during capture.

`capture-environment.json` pins the application, browser, viewport, fixture counts, and fixture hashes. `feel-targets.json` translates the visual reference into the initial A3 tuning bands. The strict post-settle target remains screen-space pixels per rendered frame; the committed RMS capture values are world-coordinate diagnostics and are not substituted for that target.

The drag recordings show Obsidian reheating the surrounding graph immediately, followed by damped decay. The fixed capture window ends before the strict calm threshold in several drag scenarios, so A3 uses the wider release-settle band and must tighten it from headless engine measurements rather than pretending the video measured a precise final tick.
