import { describe, expect, it } from 'vitest';
import {
  SETTINGS,
  GRAPH_LAYOUT,
  REPRESENTATIVE_REPEL_SECTION_SIZES,
  createGraphSectionBoundsForce,
  createPackingGraphLayout,
  createPackingNodes,
  createVariedPackingGraphLayout,
  createVariedPackingNodes,
  forceSimulation,
  getLargestNearestSectionGap,
  getSmallestSectionGap,
  hasRectOverlap,
  runRootSectionSimulation,
  runSectionBoundsTicks,
  toSectionRect,
  circleOverlapsSection,
  type D3PhysicsForce,
  type FGNode,
  type GraphLayoutSettings,
} from '../testSupport';

const mutationStressTest = process.env.CODEGRAPHY_MUTATION_RUN === '1' ? it.skip : it;

describe('physics/root section packing', () => {
  it('keeps passive root nodes outside expanded Section bounds during hot drag ticks', () => {
    const force = createGraphSectionBoundsForce(GRAPH_LAYOUT, {
    settings: SETTINGS,
    });
    const nodes = [
      {
        id: 'section-1',
        isGraphSection: true,
    sectionHeight: 100,
    sectionWidth: 100,
        vx: 0,
        vy: 0,
        x: 50,
        y: 50,
      },
      {
        id: 'src/passive.ts',
        size: 10,
        vx: 80,
        vy: 0,
        x: -20,
        y: 50,
      },
      {
        id: 'src/dragged.ts',
        isDragging: true,
        size: 24,
        vx: 0,
        vy: 0,
        x: -40,
        y: 50,
      },
    ] as FGNode[];
    forceSimulation(nodes)
      .velocityDecay(SETTINGS.damping)
      .force('sectionBounds', force as D3PhysicsForce)
      .stop()
      .tick();
    expect(circleOverlapsSection(nodes[1], nodes[0])).toBe(false);
    expect(nodes[2]).toMatchObject({ x: -40, y: 50 });
  });

  it('packs expanded Graph Sections together at the root center when repel is disabled', () => {
    const graphLayout = createPackingGraphLayout(4);
    const nodes = createPackingNodes();
    const settings = {
      ...SETTINGS,
      centerForce: 1,
      repelForce: 0,
    };
    runRootSectionSimulation(nodes, graphLayout, settings, 600);
    const sectionRects = nodes.filter(node => node.isGraphSection).map(toSectionRect);
    for (let leftIndex = 0; leftIndex < sectionRects.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < sectionRects.length; rightIndex += 1) {
    expect(hasRectOverlap(sectionRects[leftIndex], sectionRects[rightIndex])).toBe(false);
      }
    }
    expect(getLargestNearestSectionGap(nodes)).toBeLessThanOrEqual(1.5);
  });

  mutationStressTest('packs many varied expanded Graph Sections together at the root center when repel is disabled', () => {
    const graphLayout = createVariedPackingGraphLayout();
    const nodes = createVariedPackingNodes();
    const settings = {
      ...SETTINGS,
      centerForce: 1,
      linkForce: 0,
      repelForce: 0,
    };
    runRootSectionSimulation(nodes, graphLayout, settings, 1_000);
    const sectionRects = nodes.filter(node => node.isGraphSection).map(toSectionRect);
    for (let leftIndex = 0; leftIndex < sectionRects.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < sectionRects.length; rightIndex += 1) {
    expect(hasRectOverlap(sectionRects[leftIndex], sectionRects[rightIndex])).toBe(false);
      }
    }
    expect(getLargestNearestSectionGap(nodes)).toBeLessThanOrEqual(2);
  }, 20_000);

  it('moves sections aside instead of burying a root node trapped between expanded sections', () => {
    const graphLayout = {
      collapsedNodes: {},
      pinnedNodes: {},
    sections: {
        'section-left': {
          id: 'section-left',
          label: 'Left',
          color: '#60a5fa',
          x: -85,
          y: -40,
          width: 80,
          height: 80,
          collapsed: false,
          updatedAt: '2026-05-12T09:00:00.000Z',
        },
        'section-right': {
          id: 'section-right',
          label: 'Right',
          color: '#60a5fa',
          x: 5,
          y: -40,
          width: 80,
          height: 80,
          collapsed: false,
          updatedAt: '2026-05-12T09:00:00.000Z',
        },
      },
      ownership: {
        'section-left': {
          itemId: 'section-left',
          itemKind: 'section',
          ownerSectionId: null,
          updatedAt: '2026-05-12T09:00:00.000Z',
        },
        'section-right': {
          itemId: 'section-right',
          itemKind: 'section',
          ownerSectionId: null,
          updatedAt: '2026-05-12T09:00:00.000Z',
        },
      },
    } satisfies GraphLayoutSettings;
    const nodes = [
      {
        id: 'section-left',
        isGraphSection: true,
    sectionHeight: 80,
    sectionWidth: 80,
        x: -45,
        y: 0,
      },
      {
        id: 'section-right',
        isGraphSection: true,
    sectionHeight: 80,
    sectionWidth: 80,
        x: 45,
        y: 0,
      },
      {
        id: 'src/root.ts',
        size: 16,
        x: 0,
        y: 0,
      },
    ] as unknown as FGNode[];
    const force = createGraphSectionBoundsForce(graphLayout, {
    settings: {
        ...SETTINGS,
        centerForce: 1,
        linkForce: 0,
        repelForce: 0,
      },
    });
    runSectionBoundsTicks(nodes, force, 160);
    expect(nodes[0].x).toBeLessThan(-45);
    expect(nodes[1].x).toBeGreaterThan(45);
    expect(circleOverlapsSection(nodes[2], nodes[0])).toBe(false);
    expect(circleOverlapsSection(nodes[2], nodes[1])).toBe(false);
  });

  it('keeps max-repel expanded Graph Sections visibly separated instead of edge-pressed', () => {
    const graphLayout = createPackingGraphLayout(4);
    const nodes = createPackingNodes();
    const settings = {
      ...SETTINGS,
      centerForce: 0.1,
      linkForce: 0,
      repelForce: 20,
    };
    runRootSectionSimulation(nodes, graphLayout, settings, 800);
    expect(getSmallestSectionGap(nodes)).toBeGreaterThanOrEqual(16);
  });

  it('scales max-repel spacing for varied expanded Graph Sections so center force does not edge-pack them', () => {
    const graphLayout = createVariedPackingGraphLayout(REPRESENTATIVE_REPEL_SECTION_SIZES);
    const nodes = createVariedPackingNodes(REPRESENTATIVE_REPEL_SECTION_SIZES);
    const settings = {
      ...SETTINGS,
      centerForce: 0.1,
      linkForce: 0,
      repelForce: 20,
    };
    runRootSectionSimulation(nodes, graphLayout, settings, 900);
    expect(getSmallestSectionGap(nodes)).toBeGreaterThanOrEqual(48);
  }, 20_000);


});
