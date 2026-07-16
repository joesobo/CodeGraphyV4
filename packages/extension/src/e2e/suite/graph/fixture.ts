import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { IGraphData } from '../../../shared/graph/contracts';
import { getCurrentE2EScenario } from '../../scenarios';
import {
  waitForExtensionMessage,
  waitForExtensionMessageWhere,
  waitForGraphIndexStatus,
} from './messages';

export interface CodeGraphyAPI {
  refresh(): Promise<void>;
  refreshSettings(): void;
  getGraphData(): IGraphData;
  sendToWebview(message: unknown): void;
  onWebviewMessage(handler: (message: unknown) => void): vscode.Disposable;
  dispatchWebviewMessage(message: unknown): Promise<void>;
  onExtensionMessage(handler: (message: unknown) => void): vscode.Disposable;
}

export const scenario = getCurrentE2EScenario();
export const CODEGRAPHY_ROOT_PROVIDER_EDGE_THRESHOLD = 1_000;
export const CODEGRAPHY_ROOT_RENDERED_EDGE_THRESHOLD = 1_000;
export const CODEGRAPHY_ROOT_RENDERED_NODE_THRESHOLD = 500;
export const CODEGRAPHY_ROOT_INDEX_TIMEOUT_MS = 600_000;

let indexedGraphPromise: Promise<void> | undefined;
let discoveredGraphPromise: Promise<void> | undefined;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getAPI(): Promise<CodeGraphyAPI> {
  const extension = vscode.extensions.getExtension<CodeGraphyAPI>('codegraphy.codegraphy');
  assert.ok(extension, 'Extension not found');
  return extension.activate();
}

export function sortedStrings(values: readonly string[]): string[] {
  return [...values].sort();
}

export function getFileNodeIds(graphData: IGraphData): string[] {
  return sortedStrings(
    graphData.nodes
      .map(node => String(node.id))
      .filter(nodeId => !nodeId.includes('#')),
  );
}

export function getFileEdgeIds(graphData: IGraphData): string[] {
  return sortedStrings(
    graphData.edges
      .filter(edge => !String(edge.from).includes('#') && !String(edge.to).includes('#'))
      .map(edge => String(edge.id)),
  );
}

export function assertIncludesAll(
  actualIds: readonly string[],
  expectedIds: readonly string[],
  label: string,
): void {
  const missingIds = expectedIds.filter(expectedId => !actualIds.includes(expectedId));
  assert.deepStrictEqual(missingIds, [], `${label} missing from ${actualIds.join(', ')}`);
}

function edgeIdMatchesExpected(actualId: string, expectedId: string): boolean {
  return actualId === expectedId || actualId.startsWith(`${expectedId}:`);
}

export function assertIncludesAllEdges(
  actualIds: readonly string[],
  expectedIds: readonly string[],
  label: string,
): void {
  const missingIds = expectedIds.filter(
    expectedId => !actualIds.some(actualId => edgeIdMatchesExpected(actualId, expectedId)),
  );
  assert.deepStrictEqual(missingIds, [], `${label} missing from ${actualIds.join(', ')}`);
}

export function getScenarioPackagePlugin(): { pluginId: string; packageName: string } {
  switch (scenario.name) {
    case 'typescript':
      return {
        pluginId: 'codegraphy.typescript',
        packageName: '@codegraphy-dev/plugin-typescript',
      };
    case 'godot':
      return {
        pluginId: 'codegraphy.gdscript',
        packageName: '@codegraphy-dev/plugin-godot',
      };
    case 'codegraphy-root':
      throw new Error('The CodeGraphy root scenario does not have a single package plugin');
  }
}

function getWorkspaceRoot(): string {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  assert.ok(workspaceRoot, 'Expected an open workspace folder');
  return workspaceRoot;
}

export function getGraphCachePath(): string {
  return path.join(getWorkspaceRoot(), '.codegraphy', 'graph.lbug');
}

export function getRepoMetaPath(): string {
  return path.join(getWorkspaceRoot(), '.codegraphy', 'meta.json');
}

export function unlinkIfExists(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

export function getIndexTimeoutMs(): number {
  return scenario.name === 'codegraphy-root'
    ? CODEGRAPHY_ROOT_INDEX_TIMEOUT_MS
    : 30_000;
}

export function resetIndexedGraph(): void {
  indexedGraphPromise = undefined;
}

export function resetGraphReadiness(): void {
  indexedGraphPromise = undefined;
  discoveredGraphPromise = undefined;
}

export async function ensureIndexedGraph(api: CodeGraphyAPI): Promise<void> {
  await vscode.commands.executeCommand('codegraphy.open');

  indexedGraphPromise ??= (async () => {
    const timeoutMs = getIndexTimeoutMs();
    const graphUpdated = scenario.name === 'codegraphy-root'
      ? waitForExtensionMessageWhere<{
        type: 'GRAPH_DATA_UPDATED';
        payload: IGraphData;
      }>(
        api,
        'GRAPH_DATA_UPDATED',
        message => message.payload.edges.length > CODEGRAPHY_ROOT_PROVIDER_EDGE_THRESHOLD,
        timeoutMs,
      )
      : waitForExtensionMessage(api, 'GRAPH_DATA_UPDATED', timeoutMs);
    const indexUpdated = waitForGraphIndexStatus(api, true, timeoutMs);
    await api.dispatchWebviewMessage({ type: 'INDEX_GRAPH' });
    await Promise.all([graphUpdated, indexUpdated]);
    await sleep(500);
  })();

  await indexedGraphPromise;
  await sleep(250);
}

export async function ensureDiscoveredGraph(api: CodeGraphyAPI): Promise<void> {
  discoveredGraphPromise ??= (async () => {
    await vscode.commands.executeCommand('codegraphy.open');
    await waitForDiscoveredGraph(api);
  })();

  await discoveredGraphPromise;
}

async function waitForDiscoveredGraph(
  api: CodeGraphyAPI,
  timeoutMs = 15_000,
): Promise<IGraphData> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const graphData = api.getGraphData();
    if (graphData.nodes.length > 0) return graphData;
    await sleep(250);
  }

  const graphData = api.getGraphData();
  throw new Error(
    `Timed out waiting for discovered graph: ${graphData.nodes.length} node(s), ${graphData.edges.length} edge(s)`,
  );
}

