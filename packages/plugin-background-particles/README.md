# CodeGraphy Background Particles Plugin

Canvas particle effects for the CodeGraphy Graph Stage background.

The built-in presets are adapted from Odysseus' open-source theme particles:
Synapse, Rain, Constellations, Perlin Flow, Leaves, Sparkles, and Embers.

## Custom Effects

Custom particle effects are browser-side JavaScript modules. A custom module
should export `activateParticleEffect(context)` and return an optional cleanup
function.

```js
export function activateParticleEffect({ canvas, intensity }) {
  const ctx = canvas.getContext('2d');
  let frame = 0;

  function draw() {
    frame = requestAnimationFrame(draw);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `rgba(120, 255, 180, ${0.3 * intensity})`;
    ctx.fillRect(24, 24, 8, 8);
  }

  draw();
  return () => cancelAnimationFrame(frame);
}
```

Workspace-local custom effects should live under `.codegraphy/particles/`.
Set `backgroundEffects.preset` to `custom` and `backgroundEffects.customModule`
to the module path.

## License Note

The Odysseus particle routines are adapted from
`pewdiepie-archdaemon/odysseus`, which is AGPL-3.0 licensed. CodeGraphy must
review that license before publishing or merging this package.
