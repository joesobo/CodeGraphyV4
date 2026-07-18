# CodeGraphy Particles Plugin

Canvas particle effects for the CodeGraphy Graph Stage background.

The built-in presets are Synapse, Rain, Constellations, Perlin Flow, Leaves,
Sparkles, Embers, and Snow.

## Install

```bash
npm install -g @codegraphy-dev/plugin-particles
codegraphy plugins register @codegraphy-dev/plugin-particles
codegraphy plugins enable @codegraphy-dev/plugin-particles
codegraphy index
```

## Custom Effects

Create TypeScript effects in `.codegraphy/particles/`. CodeGraphy compiles
those files into webview-safe modules and adds them to the plugin's Themes panel
section beside the built-in presets.

```ts
interface ParticleEffectContext {
  canvas: HTMLCanvasElement;
  intensity: number;
}

export function activateParticleEffect({ canvas }: ParticleEffectContext): () => void {
  const ctx = canvas.getContext('2d');
  let frame = 0;

  function draw(): void {
    frame = requestAnimationFrame(draw);
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    // Draw particles here.
  }

  draw();
  return () => cancelAnimationFrame(frame);
}
```

Use `pluginData["codegraphy.particles"].customEffectId` to select a custom
effect by file name without the extension storing generated webview URLs. For
example, `examples/.codegraphy/particles/fireflies.ts` appears as a Fireflies
toggle when the `examples/` workspace is open.

The plugin defaults effect intensity internally, so workspace settings do not
need to store an `intensity` value.
