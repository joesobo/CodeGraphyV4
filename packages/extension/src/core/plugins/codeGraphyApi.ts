/**
 * @fileoverview Per-plugin API instance that plugins receive in onLoad().
 * Delegates to EventBus, DecorationManager, ViewRegistry, etc.
 * Tracks all disposables for automatic cleanup on plugin unload.
 * @module core/plugins/CodeGraphyAPI
 */

import { Disposable, DisposableStore } from './disposable';
import { EventBus, EventPayloads, EventName } from './eventBus';
import { DecorationManager, NodeDecoration, EdgeDecoration } from './decoration/manager';
import { ViewRegistry } from '../views/registry';
import { IView } from '../views/contracts';
import type { IGraphData, IGraphNode, IGraphEdge } from '../../shared/graph/types';
import type { ExportRequest, IExporter, IToolbarAction } from '../../../../plugin-api/src/api';
import type { ICommand, IContextMenuItem } from '../../../../plugin-api/src/commands';
import { onCodeGraphyEvent, onceCodeGraphyEvent, offCodeGraphyEvent } from './codeGraphyApi.events';
import { decoratePluginEdge, decoratePluginNode, clearPluginDecorations } from './codeGraphyApi.decorations';
import {
  getGraphData,
  getNodeData,
  getNodeNeighbors,
  getNodeIncomingEdges,
  getNodeOutgoingEdges,
  getNodeEdgesFor,
  filterNodeEdgesByKind,
  getNodeSubgraph,
  findNodePath,
} from './codeGraphyApi.graph';
import {
  getPluginId,
  getCommands,
  getContextMenuItems,
  getExporters,
  getToolbarActions,
  getWorkspaceRoot,
  logPluginMessage,
} from './codeGraphyApi.utilities';
import {
  registerPluginCommand,
  registerPluginContextMenuItem,
  registerPluginExporter,
  registerPluginToolbarAction,
  registerPluginView,
} from './codeGraphyApi.registration';
import {
  sendPluginWebviewMessage,
  onPluginWebviewMessage,
  savePluginExport,
  deliverPluginWebviewMessage,
} from './codeGraphyApi.webview';
import { disposePluginApi } from './codeGraphyApi.cleanup';

/** Function that provides current graph data */
export type GraphDataProvider = () => IGraphData;

/** Function that registers a VS Code command */
export type CommandRegistrar = (id: string, action: () => void | Promise<void>) => Disposable;

/** Function that sends a message to the webview */
export type WebviewMessageSender = (msg: { type: string; data: unknown }) => void;

/** Function that saves plugin-generated export content through the host. */
export type ExportSaver = (request: ExportRequest) => Promise<void>;

export interface CodeGraphyApiContext {
  readonly pluginId: string;
  readonly eventBus: EventBus;
  readonly decorationManager: DecorationManager;
  readonly viewRegistry: ViewRegistry;
  readonly graphProvider: GraphDataProvider;
  readonly commandRegistrar: CommandRegistrar;
  readonly webviewSender: WebviewMessageSender;
  readonly exportSaver: ExportSaver;
  readonly workspaceRoot: string;
  readonly disposables: DisposableStore;
  readonly commands: ICommand[];
  readonly contextMenuItems: IContextMenuItem[];
  readonly exporters: IExporter[];
  readonly toolbarActions: IToolbarAction[];
  readonly webviewMessageHandlers: Set<(msg: { type: string; data: unknown }) => void>;
  readonly logFn: (level: string, ...args: unknown[]) => void;
}

/**
 * Concrete implementation of the CodeGraphy API for a single plugin.
 * Each plugin gets its own scoped instance that tracks its disposables.
 */
export class CodeGraphyAPIImpl {
  readonly version = '2.0.0';
  private readonly _context: CodeGraphyApiContext;

  constructor(
    pluginId: string,
    eventBus: EventBus,
    decorationManager: DecorationManager,
    viewRegistry: ViewRegistry,
    graphProvider: GraphDataProvider,
    commandRegistrar: CommandRegistrar,
    webviewSender: WebviewMessageSender,
    exportSaver: ExportSaver,
    workspaceRoot: string,
    logFn: (level: string, ...args: unknown[]) => void,
  ) {
    this._context = {
      pluginId,
      eventBus,
      decorationManager,
      viewRegistry,
      graphProvider,
      commandRegistrar,
      webviewSender,
      exportSaver,
      workspaceRoot,
      disposables: new DisposableStore(),
      commands: [],
      contextMenuItems: [],
      exporters: [],
      toolbarActions: [],
      webviewMessageHandlers: new Set(),
      logFn,
    };
  }

  // ── Events ──

  on<E extends EventName>(event: E, handler: (payload: EventPayloads[E]) => void): Disposable {
    return this._context.disposables.add(onCodeGraphyEvent(this._context, event, handler));
  }

  once<E extends EventName>(event: E, handler: (payload: EventPayloads[E]) => void): Disposable {
    return this._context.disposables.add(onceCodeGraphyEvent(this._context, event, handler));
  }

  off<E extends EventName>(event: E, handler: (payload: EventPayloads[E]) => void): void {
    offCodeGraphyEvent(this._context, event, handler);
  }

  // ── Decorations ──

  decorateNode(nodeId: string, decoration: NodeDecoration): Disposable {
    return this._context.disposables.add(decoratePluginNode(this._context, nodeId, decoration));
  }

  decorateEdge(edgeId: string, decoration: EdgeDecoration): Disposable {
    return this._context.disposables.add(decoratePluginEdge(this._context, edgeId, decoration));
  }

  clearDecorations(): void {
    clearPluginDecorations(this._context);
  }

  // ── Graph Queries ──

  getGraph(): IGraphData {
    return getGraphData(this._context);
  }

  getNode(id: string): IGraphNode | null {
    return getNodeData(id, this._context);
  }

  getNeighbors(id: string): IGraphNode[] {
    return getNodeNeighbors(id, this._context);
  }

  getIncomingEdges(nodeId: string): IGraphEdge[] {
    return getNodeIncomingEdges(nodeId, this._context);
  }

  getOutgoingEdges(nodeId: string): IGraphEdge[] {
    return getNodeOutgoingEdges(nodeId, this._context);
  }

  getEdgesFor(nodeId: string): IGraphEdge[] {
    return getNodeEdgesFor(nodeId, this._context);
  }

  filterEdgesByKind(kind: IGraphEdge['kind'] | IGraphEdge['kind'][]): IGraphEdge[] {
    return filterNodeEdgesByKind(kind, this._context);
  }

  getSubgraph(nodeId: string, hops: number): IGraphData {
    return getNodeSubgraph(nodeId, hops, this._context);
  }

  findPath(fromId: string, toId: string): IGraphNode[] | null {
    return findNodePath(fromId, toId, this._context);
  }

  // ── Registration ──

  registerView(view: IView): Disposable {
    return this._context.disposables.add(registerPluginView(this._context, view));
  }

  registerCommand(command: ICommand): Disposable {
    return this._context.disposables.add(registerPluginCommand(this._context, command));
  }

  registerContextMenuItem(item: IContextMenuItem): Disposable {
    return this._context.disposables.add(registerPluginContextMenuItem(this._context, item));
  }

  registerExporter(exporter: IExporter): Disposable {
    return this._context.disposables.add(registerPluginExporter(this._context, exporter));
  }

  registerToolbarAction(action: IToolbarAction): Disposable {
    return this._context.disposables.add(registerPluginToolbarAction(this._context, action));
  }

  // ── Webview Communication (Tier 2) ──

  sendToWebview(msg: { type: string; data: unknown }): void {
    sendPluginWebviewMessage(this._context, msg);
  }

  onWebviewMessage(handler: (msg: { type: string; data: unknown }) => void): Disposable {
    return this._context.disposables.add(onPluginWebviewMessage(this._context, handler));
  }

  saveExport(request: ExportRequest): Promise<void> {
    return savePluginExport(this._context, request);
  }

  /**
   * Deliver a message from the webview to this plugin's handlers.
   * Called by the GraphViewProvider when it receives a plugin-targeted message.
   */
  deliverWebviewMessage(msg: { type: string; data: unknown }): void {
    deliverPluginWebviewMessage(this._context, msg);
  }

  // ── Utilities ──

  getWorkspaceRoot(): string {
    return getWorkspaceRoot(this._context);
  }

  log(level: 'info' | 'warn' | 'error', ...args: unknown[]): void {
    logPluginMessage(this._context, level, ...args);
  }

  // ── Accessors for the host ──

  get pluginId(): string {
    return getPluginId(this._context);
  }

  get commands(): readonly ICommand[] {
    return getCommands(this._context);
  }

  get contextMenuItems(): readonly IContextMenuItem[] {
    return getContextMenuItems(this._context);
  }

  get exporters(): readonly IExporter[] {
    return getExporters(this._context);
  }

  get toolbarActions(): readonly IToolbarAction[] {
    return getToolbarActions(this._context);
  }

  /**
   * Dispose all resources registered by this plugin.
   */
  disposeAll(): void {
    disposePluginApi(this._context);
  }
}
