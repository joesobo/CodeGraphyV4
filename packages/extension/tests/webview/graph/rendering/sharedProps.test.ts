import { describe, expect, it, vi } from 'vitest';
import type { FGLink, FGNode } from '../../../../src/webview/components/graph/model/build';
import {
  buildSharedGraphProps,
  INTERACTIVE_COOLDOWN_TICKS,
  MAX_INTERACTIVE_PHYSICS_EDGES,
  MAX_INTERACTIVE_PHYSICS_NODES,
  PRESETTLE_WARMUP_TICKS,
  normalizeGraphDimension,
  resolveGraphCooldownTicks,
  TIMELINE_COOLDOWN_TICKS,
  type BuildSharedGraphPropsOptions,
} from '../../../../src/webview/components/graph/rendering/surface/sharedProps';

function createNode(overrides: Partial<FGNode> = {}): FGNode {
  return {
    id: 'src/app.ts',
    label: 'app.ts',
    size: 16,
    color: '#3b82f6',
    borderColor: '#1d4ed8',
    borderWidth: 2,
    baseOpacity: 1,
    isFavorite: false,
    ...overrides,
  } as FGNode;
}

function createLink(overrides: Partial<FGLink> = {}): FGLink {
  return {
    id: 'src/app.ts->src/utils.ts',
    from: 'src/app.ts',
    to: 'src/utils.ts',
    bidirectional: false,
    source: createNode({ id: 'src/app.ts' }),
    target: createNode({ id: 'src/utils.ts', label: 'utils.ts' }),
    ...overrides,
  } as FGLink;
}

function createOptions(
  overrides: Partial<BuildSharedGraphPropsOptions> = {},
): BuildSharedGraphPropsOptions {
  return {
    containerSize: { height: 480, width: 640 },
    dagMode: 'td',
    damping: 0.7,
    graphData: {
      links: [createLink()],
      nodes: [createNode({ x: 10, y: 20 })],
    },
    onBackgroundClick: vi.fn(),
    onBackgroundRightClick: vi.fn(),
    onEngineStop: vi.fn(),
    onLinkClick: vi.fn(),
    onLinkRightClick: vi.fn(),
    onNodeClick: vi.fn(),
    onNodeDragEnd: vi.fn(),
    onNodeHover: vi.fn(),
    onNodeRightClick: vi.fn(),
    timelineActive: false,
    ...overrides,
  };
}

describe('graph/rendering/surface/sharedProps', () => {
  it('normalizeGraphDimension keeps non-zero values and drops zeros', () => {
    expect(normalizeGraphDimension(640)).toBe(640);
    expect(normalizeGraphDimension(-24)).toBe(-24);
    expect(normalizeGraphDimension(0)).toBeUndefined();
  });

  it('builds the shared graph props for a sized DAG container', () => {
    const options = createOptions();

    const props = buildSharedGraphProps(options);

    expect(props.graphData).toBe(options.graphData);
    expect(props.width).toBe(640);
    expect(props.height).toBe(480);
    expect(props.nodeId).toBe('id');
    expect(props.d3VelocityDecay).toBe(0.7);
    expect(props.d3AlphaDecay).toBe(0.0228);
    expect(props.warmupTicks).toBe(PRESETTLE_WARMUP_TICKS);
    expect(props.cooldownTicks).toBe(INTERACTIVE_COOLDOWN_TICKS);
    expect(props.dagMode).toBe('td');
    expect(props.dagLevelDistance).toBe(60);
  });

  it('normalizes zero-sized containers and disables DAG props when dagMode is null', () => {
    const props = buildSharedGraphProps(createOptions({
      containerSize: { height: 0, width: 0 },
      dagMode: null,
      timelineActive: true,
    }));

    expect(props.width).toBeUndefined();
    expect(props.height).toBeUndefined();
    expect(props.cooldownTicks).toBe(TIMELINE_COOLDOWN_TICKS);
    expect(props.dagMode).toBeUndefined();
    expect(props.dagLevelDistance).toBeUndefined();
  });

  it('keeps positioned interactive graphs on the normal physics cooldown', () => {
    const props = buildSharedGraphProps(createOptions({
      graphData: {
        links: [createLink()],
        nodes: [createNode({ x: 10, y: 20 })],
      },
    }));

    expect(props.cooldownTicks).toBe(INTERACTIVE_COOLDOWN_TICKS);
  });

  it('keeps unpositioned interactive graphs on the normal physics cooldown', () => {
    const props = buildSharedGraphProps(createOptions({
      graphData: {
        links: [createLink()],
        nodes: [createNode()],
      },
    }));

    expect(props.cooldownTicks).toBe(INTERACTIVE_COOLDOWN_TICKS);
  });

  it('keeps giant file graphs within the interactive physics budget', () => {
    expect(resolveGraphCooldownTicks(
      MAX_INTERACTIVE_PHYSICS_NODES,
      MAX_INTERACTIVE_PHYSICS_EDGES,
      false,
    ))
      .toBe(INTERACTIVE_COOLDOWN_TICKS);
  });

  it('skips synchronous physics above the interactive node budget', () => {
    const props = buildSharedGraphProps(createOptions({
      graphData: {
        links: [],
        nodes: new Array<FGNode>(MAX_INTERACTIVE_PHYSICS_NODES + 1).fill(createNode()),
      },
    }));

    expect(props.cooldownTicks).toBe(0);
    expect(props.warmupTicks).toBe(0);
  });

  it('skips synchronous timeline physics above the node budget', () => {
    expect(resolveGraphCooldownTicks(
      MAX_INTERACTIVE_PHYSICS_NODES + 1,
      0,
      true,
    )).toBe(0);
  });

  it('skips synchronous physics above the interactive edge budget', () => {
    expect(resolveGraphCooldownTicks(
      2,
      MAX_INTERACTIVE_PHYSICS_EDGES + 1,
      false,
    )).toBe(0);
  });

  it('normalizes width and height independently', () => {
    const widthOnly = buildSharedGraphProps(createOptions({
      containerSize: { height: 0, width: 320 },
    }));
    const heightOnly = buildSharedGraphProps(createOptions({
      containerSize: { height: 240, width: 0 },
    }));

    expect(widthOnly.width).toBe(320);
    expect(widthOnly.height).toBeUndefined();
    expect(heightOnly.width).toBeUndefined();
    expect(heightOnly.height).toBe(240);
  });

  it('delegates node, link, background, hover, and engine callbacks with the original values', () => {
    const handlers = {
      onBackgroundClick: vi.fn(),
      onBackgroundRightClick: vi.fn(),
      onEngineStop: vi.fn(),
      onLinkClick: vi.fn(),
      onLinkRightClick: vi.fn(),
      onNodeClick: vi.fn(),
      onNodeDragEnd: vi.fn(),
      onNodeHover: vi.fn(),
      onNodeRightClick: vi.fn(),
    };
    const props = buildSharedGraphProps(createOptions(handlers));
    const node = createNode();
    const link = createLink();
    const clickEvent = new MouseEvent('click');
    const contextEvent = new MouseEvent('contextmenu');

    props.onNodeClick(node, clickEvent);
    props.onNodeRightClick(node, contextEvent);
    expect(props.onNodeDragEnd).toBeDefined();
    props.onNodeDragEnd?.(node);
    props.onLinkClick(link, clickEvent);
    props.onLinkRightClick(link, contextEvent);
    props.onBackgroundClick(clickEvent);
    props.onBackgroundClick();
    props.onBackgroundRightClick(contextEvent);
    props.onNodeHover(node);
    props.onNodeHover(null);
    props.onEngineStop();

    expect(handlers.onNodeClick).toHaveBeenCalledWith(node, clickEvent);
    expect(handlers.onNodeRightClick).toHaveBeenCalledWith(node, contextEvent);
    expect(handlers.onNodeDragEnd).toHaveBeenCalledWith(node);
    expect(handlers.onLinkClick).toHaveBeenCalledWith(link, clickEvent);
    expect(handlers.onLinkRightClick).toHaveBeenCalledWith(link, contextEvent);
    expect(handlers.onBackgroundClick).toHaveBeenNthCalledWith(1, clickEvent);
    expect(handlers.onBackgroundClick).toHaveBeenNthCalledWith(2, undefined);
    expect(handlers.onBackgroundRightClick).toHaveBeenCalledWith(contextEvent);
    expect(handlers.onNodeHover).toHaveBeenNthCalledWith(1, node);
    expect(handlers.onNodeHover).toHaveBeenNthCalledWith(2, null);
    expect(handlers.onEngineStop).toHaveBeenCalledOnce();
  });

  it('installs engine tick measurement only when a callback is active', () => {
    const onEngineTick = vi.fn();

    const activeProps = buildSharedGraphProps(createOptions({ onEngineTick }));
    const inactiveProps = buildSharedGraphProps(createOptions());
    activeProps.onEngineTick?.();

    expect(onEngineTick).toHaveBeenCalledOnce();
    expect(inactiveProps.onEngineTick).toBeUndefined();
  });
});
