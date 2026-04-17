import { useCallback, useEffect, type MutableRefObject } from 'react';
import type { IFileInfo } from '../../../../../shared/files/info';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import { applyKeyboardEffects } from '../../effects/keyboard';
import { applyWebviewMessageEffects as runWebviewMessageEffects } from '../../effects/messages';
import { createGraphKeyboardListener } from '../../keyboard/listener';
import { createGraphMessageListener } from '../../messageListener';
import type { GraphWebviewMessageEffect } from '../../messages/effects/routing';
import { exportAsJpeg } from '../../../../export/jpeg';
import { exportAsJson } from '../../../../export/json/export';
import { exportAsMarkdown } from '../../../../export/markdown/export';
import { exportAsPng } from '../../../../export/png';
import { exportAsSvg } from '../../../../export/svg/export';
import { postMessage } from '../../../../vscodeApi';
import { graphStore } from '../../../../store/state';
import type { FGLink, FGNode } from '../../model/build';
import type { UseGraphStateResult } from './state';
import type { UseGraphInteractionRuntimeResult } from './interaction';

export interface UseGraphEventEffectsOptions {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  dataRef: MutableRefObject<IGraphData>;
  directionColorRef: UseGraphStateResult['directionColorRef'];
  directionModeRef: UseGraphStateResult['directionModeRef'];
  graphDataRef: MutableRefObject<{ links: FGLink[]; nodes: FGNode[] }>;
  graphMode: '2d' | '3d';
  interactionHandlers: UseGraphInteractionRuntimeResult['interactionHandlers'];
  fileInfoCacheRef: MutableRefObject<Map<string, IFileInfo>>;
  selectedNodes: string[];
  setTooltipData: UseGraphInteractionRuntimeResult['setTooltipData'];
  showLabelsRef: UseGraphStateResult['showLabelsRef'];
  themeRef: UseGraphStateResult['themeRef'];
  tooltipPath: string;
}

export function useGraphEventEffects({
  containerRef,
  dataRef,
  directionColorRef,
  directionModeRef,
  graphDataRef,
  graphMode,
  interactionHandlers,
  fileInfoCacheRef,
  selectedNodes,
  setTooltipData,
  showLabelsRef,
  themeRef,
  tooltipPath,
}: UseGraphEventEffectsOptions): void {
  const applyWebviewMessageEffects = useCallback((effects: GraphWebviewMessageEffect[]) => {
    runWebviewMessageEffects(effects, {
      fitView: () => interactionHandlers.fitView(),
      zoom2d: factor => interactionHandlers.zoom2d(factor),
      cacheFileInfo: info => fileInfoCacheRef.current.set(info.path, info),
      updateTooltipInfo: info => setTooltipData(previous => ({ ...previous, info })),
      postMessage,
      openInEditor: () => postMessage({ type: 'OPEN_IN_EDITOR' }),
      exportPng: () => exportAsPng(containerRef.current),
      exportSvg: () => exportAsSvg(graphDataRef.current.nodes, graphDataRef.current.links, {
        directionMode: directionModeRef.current,
        directionColor: directionColorRef.current,
        showLabels: showLabelsRef.current,
        theme: themeRef.current,
      }),
      exportJpeg: () => exportAsJpeg(containerRef.current),
      exportJson: () => exportAsJson(dataRef.current),
      exportMarkdown: () => exportAsMarkdown(dataRef.current),
      updateAccessCount: (nodeId, accessCount) => interactionHandlers.updateAccessCount(nodeId, accessCount),
    });
  }, [
    containerRef,
    dataRef,
    directionColorRef,
    directionModeRef,
    fileInfoCacheRef,
    graphDataRef,
    interactionHandlers,
    setTooltipData,
    showLabelsRef,
    themeRef,
  ]);

  useEffect(() => {
    const handleMessage = createGraphMessageListener({
      applyEffects: applyWebviewMessageEffects,
      graphMode,
      tooltipPath,
      getGraphNodes: () => graphDataRef.current.nodes,
    });
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [applyWebviewMessageEffects, graphDataRef, graphMode, tooltipPath]);

  useEffect(() => {
    const handleKeyDown = createGraphKeyboardListener({
      graphMode,
      selectedNodeIds: selectedNodes,
      getAllNodeIds: () => graphDataRef.current.nodes.map(node => node.id),
      fitView: () => interactionHandlers.fitView(),
      setSelection: nodeIds => interactionHandlers.setSelection(nodeIds),
      openNode: nodeId => interactionHandlers.requestNodeOpenById(nodeId),
      zoom2d: factor => interactionHandlers.zoom2d(factor),
      postMessage,
      dispatchStoreMessage: message => {
        graphStore.getState().handleExtensionMessage(message);
      },
      runEffects: applyKeyboardEffects,
    });
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [graphDataRef, graphMode, interactionHandlers, selectedNodes]);
}
