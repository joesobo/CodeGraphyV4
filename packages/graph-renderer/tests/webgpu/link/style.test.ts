import { describe, expect, it } from 'vitest';
import type { GraphRendererFrame } from '../../../src';
import { createLinkStyles, writeLinkStyle } from '../../../src/webgpu/link/style';

function frame(): GraphRendererFrame {
  const source = { id: 'source', x: 0, y: 0 };
  const target = { id: 'target', x: 10, y: 0 };
  return {
    backgroundColor: '#000000',
    camera: { centerX: 0, centerY: 0, zoom: 1 },
    cssHeight: 100,
    cssWidth: 100,
    devicePixelRatio: 1,
    directionMode: 'none',
    edgeSources: new Uint32Array([0]),
    edgeTargets: new Uint32Array([1]),
    getArrowColor: () => '#000000',
    getLinkColor: () => '#123456',
    getLinkOpacity: () => 0.5,
    getLinkWidth: () => 2,
    getNodeStyle: () => ({
      borderColor: '#000000', borderWidth: 0, cornerRadius: 0,
      fillColor: '#ffffff', fillOpacity: 1, height: 10, opacity: 1,
      shape: 'circle', width: 10,
    }),
    links: [{ source, target }],
    nodes: [source, target],
    nodeX: new Float32Array([0, 10]),
    nodeY: new Float32Array([0, 0]),
    positionVersion: 0,
    styleVersion: 0,
    hoveredNodeIndex: -1,
    hoveredNodeScale: 1,
  };
}

describe('link style packing', () => {
  it('reuses a retained output array when its size still matches', () => {
    const retained = new Float32Array(9);

    expect(createLinkStyles(frame(), retained)).toBe(retained);
  });

  it('resizes a retained output array when the graph size changes', () => {
    const retained = new Float32Array(0);

    expect(createLinkStyles(frame(), retained)).not.toBe(retained);
  });

  it('packs each link width, color, opacity, and arrow color', () => {
    const input = frame();
    const second = { source: input.nodes[1], target: input.nodes[0] };
    input.links = [input.links[0], second];
    input.getLinkWidth = link => link === second ? 4 : 0.1;
    input.getLinkColor = link => link === second ? '#00ff00' : '#ff0000';
    input.getLinkOpacity = link => link === second ? 2 : 0.5;
    input.getArrowColor = link => link === second ? '#0000ff' : '#ffffff';

    const packed = createLinkStyles(input);

    expect(Array.from(packed)).toEqual([
      expect.closeTo(0.35), 1, 0, 0, 0.5, 1, 1, 1, 1,
      2, 0, 1, 0, 1, 0, 0, 1, 1,
    ]);
  });

  it('writes a selected cached link into a nonzero rendered slot', () => {
    const cached = Float32Array.from([
      1, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8,
      2, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2,
    ]);
    const output = new Float32Array(22);

    writeLinkStyle(output, cached, { bidirectional: true }, 1, 1, 0.25);

    expect(Array.from(output.slice(11))).toEqual([
      2, 0.25,
      expect.closeTo(0.9), expect.closeTo(0.8), expect.closeTo(0.7),
      expect.closeTo(0.6), expect.closeTo(0.5), expect.closeTo(0.4),
      expect.closeTo(0.3), expect.closeTo(0.2),
      1,
    ]);
  });
});
