import type { Dispatch, SetStateAction } from 'react';
import { vi } from 'vitest';
import type { IFileInfo } from '../../../../../../src/shared/files/info';
import type { IGraphData } from '../../../../../../src/shared/graph/contracts';
import type { FGLink, FGNode } from '../../../../../../src/webview/components/graph/model/build';
import type { GraphInteractionHandlers } from '../../../../../../src/webview/components/graph/interactionRuntime/handlers';
import type { GraphTooltipState } from '../../../../../../src/webview/components/graph/tooltip/model';

export interface MessageEffectHandlers {
  cacheFileInfo: (info: IFileInfo) => void;
  exportJpeg: () => void;
  exportJson: () => void;
  exportMarkdown: () => void;
  exportPng: () => void;
  exportSvg: () => void;
  fitView: () => void;
  postMessage: ReturnType<typeof vi.fn>;
  updateTooltipInfo: (info: IFileInfo) => void;
  zoomGraphView: (factor: number) => void;
}

export interface GraphEventHookProps {
  interactionHandlers: GraphInteractionHandlers;
  selectedNodes: string[];
  tooltipPath: string;
}

export function createInteractionHandlers(): GraphInteractionHandlers {
  return {
    applyGraphInteractionEffects: vi.fn(),
    clearSelection: vi.fn(),
    fitView: vi.fn(),
    focusNodeById: vi.fn(),
    getBackgroundGraphPosition: vi.fn(),
    handleBackgroundClick: vi.fn(),
    handleLinkClick: vi.fn(),
    handleNodeClick: vi.fn(),
    openBackgroundContextMenu: vi.fn(),
    openEdgeContextMenu: vi.fn(),
    openNodeContextMenu: vi.fn(),
    previewNode: vi.fn(),
    requestNodeOpenById: vi.fn(),
    selectOnlyNode: vi.fn(),
    sendGraphInteraction: vi.fn(),
    setGraphCursor: vi.fn(),
    setHighlight: vi.fn(),
    setSelection: vi.fn(),
    zoomGraphView: vi.fn(),
  };
}

export function createTooltipSetter() {
  let tooltipData: GraphTooltipState = {
    visible: false,
    nodeRect: { x: 0, y: 0, radius: 0 },
    path: '',
    info: null,
    pluginSections: [],
  };

  return {
    getTooltipData: () => tooltipData,
    setTooltipData: vi.fn(
      (value: GraphTooltipState | ((previous: GraphTooltipState) => GraphTooltipState)) => {
        tooltipData = typeof value === 'function' ? value(tooltipData) : value;
      },
    ) as Dispatch<SetStateAction<GraphTooltipState>>,
  };
}

export function createData(path = 'src/app.ts'): IGraphData {
  return {
    edges: [],
    nodes: [{ id: path, path }],
  } as unknown as IGraphData;
}

export function createNode(id: string): FGNode {
  return { id } as FGNode;
}

export function createLink(id: string): FGLink {
  return { id } as FGLink;
}
