import * as vscode from 'vscode';
import { DEFAULT_DIRECTION_COLOR, DEFAULT_FOLDER_NODE_COLOR, normalizeHexColor } from '../../../shared/fileColors';
import type { BidirectionalEdgeMode, DirectionMode } from '../../../shared/settings/modes';

export interface IGraphViewSettingsSnapshot {
  bidirectionalEdges: BidirectionalEdgeMode;
  showOrphans: boolean;
  directionMode: DirectionMode;
  particleSpeed: number;
  particleSize: number;
  directionColor: string;
  showLabels: boolean;
}

interface IGraphViewSettingsReader {
  get<T>(section: string, defaultValue: T): T;
}

export interface IGraphViewDisabledState {
  disabledPlugins: Set<string>;
  changed: boolean;
}

export function normalizeDirectionColor(value: string | undefined): string {
  return normalizeHexColor(value, DEFAULT_DIRECTION_COLOR);
}

export function normalizeFolderNodeColor(value: string | undefined): string {
  return normalizeHexColor(value, DEFAULT_FOLDER_NODE_COLOR);
}

export function getGraphViewConfigTarget(
  workspaceFolders: readonly unknown[] | undefined
): vscode.ConfigurationTarget {
  return workspaceFolders?.length
    ? vscode.ConfigurationTarget.Workspace
    : vscode.ConfigurationTarget.Global;
}

export function areGraphViewSetsEqual<T>(setA: Set<T>, setB: Set<T>): boolean {
  if (setA.size !== setB.size) return false;

  for (const value of setA) {
    if (!setB.has(value)) return false;
  }

  return true;
}

export function resolveGraphViewDisabledState(
  currentDisabledPlugins: Set<string>,
  configuredPlugins: readonly string[] | undefined,
  storedPlugins: readonly string[] | undefined
): IGraphViewDisabledState {
  const disabledPlugins = new Set(configuredPlugins ?? storedPlugins ?? []);

  return {
    disabledPlugins,
    changed: !areGraphViewSetsEqual(currentDisabledPlugins, disabledPlugins),
  };
}

export function readGraphViewSettings(
  config: IGraphViewSettingsReader
): IGraphViewSettingsSnapshot {
  return {
    bidirectionalEdges: config.get<BidirectionalEdgeMode>('bidirectionalEdges', 'separate'),
    showOrphans: config.get<boolean>('showOrphans', true),
    directionMode: config.get<string>('directionMode', 'arrows') as DirectionMode,
    particleSpeed: config.get<number>('particleSpeed', 0.005),
    particleSize: config.get<number>('particleSize', 4),
    directionColor: normalizeDirectionColor(
      config.get<string>('directionColor', DEFAULT_DIRECTION_COLOR)
    ),
    showLabels: config.get<boolean>('showLabels', true),
  };
}
