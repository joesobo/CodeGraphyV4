import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const references = path.resolve(import.meta.dirname, '../../references');

async function json<T>(relativePath: string): Promise<T> {
  return JSON.parse(await readFile(path.join(references, relativePath), 'utf8')) as T;
}

describe('owned graph benchmark evidence', () => {
  it('records an identical-protocol five-run legacy comparison', async () => {
    const comparison = await json<{
      protocol: { runs: number };
      legacy: { fps: number[] };
      owned: { fps: number[] };
      change: { fpsPercent: number; hoverP50Percent: number; retainedHeapPercent: number };
    }>('comparison/legacy-vs-owned-1k.json');
    expect(comparison.protocol.runs).toBe(5);
    expect(comparison.legacy.fps).toHaveLength(5);
    expect(comparison.owned.fps).toHaveLength(5);
    expect(comparison.change.fpsPercent).toBeGreaterThan(150);
    expect(comparison.change.hoverP50Percent).toBeGreaterThan(0);
    expect(comparison.change.retainedHeapPercent).toBeGreaterThan(0);
  });

  it('records all force-slider extrema and dynamic 10k updates', async () => {
    const sliders = await json<{
      checks: Record<string, { layoutMoved: boolean }>;
    }>('webgpu/open-editor-force-sliders/metadata.json');
    expect(Object.keys(sliders.checks)).toEqual([
      'repelForce',
      'centerForce',
      'linkDistance',
      'linkForce',
    ]);
    expect(Object.values(sliders.checks).every(check => check.layoutMoved)).toBe(true);
    await expect(access(path.join(
      references,
      'webgpu/open-editor-force-sliders/open-editor.png',
    ))).resolves.toBeUndefined();

    const dynamic = await json<{
      renderer: string;
      layout: string;
      cameraZoomPreserved: boolean;
      median: { add1000NodesMs: number; remove1000NodesMs: number; modify900NodeStylesMs: number };
    }>('webgpu/open-editor-dynamic-10k/metadata.json');
    expect(dynamic.renderer).toBe('webgpu');
    expect(dynamic.layout).toBe('worker');
    expect(dynamic.cameraZoomPreserved).toBe(true);
    expect(dynamic.median.add1000NodesMs).toBeLessThan(500);
    expect(dynamic.median.remove1000NodesMs).toBeLessThan(500);
    expect(dynamic.median.modify900NodeStylesMs).toBeLessThan(100);
  });
});
