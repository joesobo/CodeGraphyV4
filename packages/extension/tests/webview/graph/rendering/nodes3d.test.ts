import { beforeEach, describe, expect, it, vi } from 'vitest';

const add = vi.fn();
const groupInstance = { add };
const spriteInstance = {
  color: '',
  offsetY: 0,
  textHeight: 0,
};

vi.mock('three', () => ({
  Group: vi.fn(() => groupInstance),
}));

vi.mock('three-spritetext', () => ({
  default: vi.fn(() => spriteInstance),
}));

vi.mock('../../../../src/webview/components/graph/rendering/shapes3D', () => ({
  createImageSprite: vi.fn(() => ({ kind: 'image-sprite' })),
  createNodeMesh: vi.fn(() => ({ kind: 'mesh' })),
}));

vi.mock('../../../../src/webview/components/graphSupport', () => ({
  setSpriteVisible: vi.fn(),
}));

import SpriteText from 'three-spritetext';
import { createImageSprite, createNodeMesh } from '../../../../src/webview/components/graph/rendering/shapes3D';
import { setSpriteVisible } from '../../../../src/webview/components/graphSupport';
import type { FGNode } from '../../../../src/webview/components/graphModel';
import { createNodeThreeObject } from '../../../../src/webview/components/graph/rendering/nodes3d';

function createNode(overrides: Partial<FGNode> = {}): FGNode {
  return {
    id: 'src/app.ts',
    label: 'app.ts',
    size: 16,
    color: '#22c55e',
    borderColor: '#16a34a',
    borderWidth: 2,
    baseOpacity: 1,
    isFavorite: false,
    ...overrides,
  } as FGNode;
}

describe('graph/rendering/nodes3d', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a group with the node mesh and label sprite and stores both refs', () => {
    const meshesRef = { current: new Map<string, unknown>() };
    const spritesRef = { current: new Map<string, unknown>() };

    const result = createNodeThreeObject({
      meshesRef: meshesRef as never,
      showLabelsRef: { current: true },
      spritesRef: spritesRef as never,
    }, createNode());

    expect(createNodeMesh).toHaveBeenCalledWith('sphere', '#22c55e', 4);
    expect(SpriteText).toHaveBeenCalledWith('app.ts');
    expect(setSpriteVisible).toHaveBeenCalledWith(spriteInstance, true);
    expect(add).toHaveBeenCalledWith({ kind: 'mesh' });
    expect(add).toHaveBeenCalledWith(spriteInstance);
    expect(meshesRef.current.get('src/app.ts')).toEqual({ kind: 'mesh' });
    expect(spritesRef.current.get('src/app.ts')).toBe(spriteInstance);
    expect(result).toBe(groupInstance);
  });

  it('adds an image sprite when the node includes an image URL', () => {
    createNodeThreeObject({
      meshesRef: { current: new Map() } as never,
      showLabelsRef: { current: false },
      spritesRef: { current: new Map() } as never,
    }, createNode({ imageUrl: 'https://example.com/icon.png' }));

    expect(createImageSprite).toHaveBeenCalledWith('https://example.com/icon.png', 6);
    expect(add).toHaveBeenCalledWith({ kind: 'image-sprite' });
  });

  it('positions the label sprite above the node using the scaled node size', () => {
    createNodeThreeObject({
      meshesRef: { current: new Map() } as never,
      showLabelsRef: { current: true },
      spritesRef: { current: new Map() } as never,
    }, createNode({ size: 32 }));

    expect(spriteInstance.textHeight).toBe(6);
    expect(spriteInstance.offsetY).toBe(20);
    expect(spriteInstance.color).toBe('#ffffff');
  });
});
