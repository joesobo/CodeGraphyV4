/**
 * @fileoverview Per-plugin API instance that plugins receive in onLoad().
 * Delegates to EventBus, DecorationManager, ViewRegistry, etc.
 * Tracks all disposables for automatic cleanup on plugin unload.
 * @module core/plugins/CodeGraphyAPI
 */

import { Disposable, DisposableStore, toDisposable } from './disposable';
import { EventBus, EventPayloads, EventName } from './eventBus';
import { DecorationManager, NodeDecoration, EdgeDecoration } from './decoration/manager';
import { ViewRegistry } from '../views/registry';
import { IView } from '../views/contracts';
import type { IGraphData, IGraphNode, IGraphEdge } from '../../shared/graph/types';
import type { ExportRequest, IExporter, IToolbarAction } from '../../../../plugin-api/src/api';
import type { ICommand, IContextMenuItem } from '../../../../plugin-api/src/commands';
import {
  filterEdgesByKind as facadeFilterEdgesByKind,
  findPath as facadeFindPath,
  getGraph as facadeGetGraph,
  getIncomingEdges as facadeGetIncomingEdges,
  getNode as facadeGetNode,
  getNeighbors as facadeGetNeighbors,
  getOutgoingEdges as facadeGetOutgoingEdges,
  getSubgraph as facadeGetSubgraph,
  getEdgesFor as facadeGetEdgesFor,
} from './graphQueryFacade';

/** Function that provides current graph data */
export type GraphDataProvider = () => IGraphData;

/** Function that registers a VS Code command */
export type CommandRegistrar = (id: string, action: () => void | Promise<void>) => Disposable;

/** Function that sends a message to the webview */
export type WebviewMessageSender = (msg: { type: string; data: unknown }) => void;

/** Function that saves plugin-generated export content through the host. */
export type ExportSaver = (request: ExportRequest) => Promise<void>;

/**
 * Concrete implementation of the CodeGraphy API for a single plugin.
 * Each plugin gets its own scoped instance that tracks its disposables.
 */
export class CodeGraphyAPIImpl {
  readonly version = '2.0.0';

  private readonly _pluginId: string;
  private readonly _eventBus: EventBus;
  private readonly _decorationManager: DecorationManager;
  private readonly _viewRegistry: ViewRegistry;
  private readonly _graphProvider: GraphDataProvider;
  private readonly _commandRegistrar: CommandRegistrar;
  private readonly _webviewSender: WebviewMessageSender;
  private readonly _exportSaver: ExportSaver;
  private readonly _workspaceRoot: string;
  private readonly _disposables = new DisposableStore();
  private readonly _commands: ICommand[] = [];
  private readonly _contextMenuItems: IContextMenuItem[] = [];
  private readonly _exporters: IExporter[] = [];
  private readonly _toolbarActions: IToolbarAction[] = [];
  private readonly _webviewMessageHandlers = new Set<(msg: { type: string; data: unknown }) => void>();
  private readonly _logFn: (level: string, ...args: unknown[]) => void;

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
    this._pluginId = pluginId;
    this._eventBus = eventBus;
    this._decorationManager = decorationManager;
    this._viewRegistry = viewRegistry;
    this._graphProvider = graphProvider;
    this._commandRegistrar = commandRegistrar;
    this._webviewSender = webviewSender;
    this._exportSaver = exportSaver;
    this._workspaceRoot = workspaceRoot;
    this._logFn = logFn;
  }

  // ── Events ──

  on<E extends EventName>(event: E, handler: (payload: EventPayloads[E]) => void): Disposable {
    const sub = this._eventBus.on(event, handler, this._pluginId);
    return this._disposables.add(sub);
  }

  once<E extends EventName>(event: E, handler: (payload: EventPayloads[E]) => void): Disposable {
    const sub = this._eventBus.once(event, handler, this._pluginId);
    return this._disposables.add(sub);
  }

  off<E extends EventName>(event: E, handler: (payload: EventPayloads[E]) => void): void {
    this._eventBus.off(event, handler);
  }

  // ── Decorations ──

  decorateNode(nodeId: string, decoration: NodeDecoration): Disposable {
    const sub = this._decorationManager.decorateNode(this._pluginId, nodeId, decoration);
    return this._disposables.add(sub);
  }

  decorateEdge(edgeId: string, decoration: EdgeDecoration): Disposable {
    const sub = this._decorationManager.decorateEdge(this._pluginId, edgeId, decoration);
    return this._disposables.add(sub);
  }

  clearDecorations(): void {
    this._decorationManager.clearDecorations(this._pluginId);
  }

  // ── Graph Queries ──

  getGraph(): IGraphData {
    return facadeGetGraph(this._graphProvider);
  }

  getNode(id: string): IGraphNode | null {
    return facadeGetNode(id, this._graphProvider);
  }

  getNeighbors(id: string): IGraphNode[] {
    return facadeGetNeighbors(id, this._graphProvider);
  }

  getIncomingEdges(nodeId: string): IGraphEdge[] {
    return facadeGetIncomingEdges(nodeId, this._graphProvider);
  }

  getOutgoingEdges(nodeId: string): IGraphEdge[] {
    return facadeGetOutgoingEdges(nodeId, this._graphProvider);
  }

  getEdgesFor(nodeId: string): IGraphEdge[] {
    return facadeGetEdgesFor(nodeId, this._graphProvider);
  }

  filterEdgesByKind(kind: IGraphEdge['kind'] | IGraphEdge['kind'][]): IGraphEdge[] {
    return facadeFilterEdgesByKind(kind, this._graphProvider);
  }

  getSubgraph(nodeId: string, hops: number): IGraphData {
    return facadeGetSubgraph(nodeId, hops, this._graphProvider);
  }

  findPath(fromId: string, toId: string): IGraphNode[] | null {
    return facadeFindPath(fromId, toId, this._graphProvider);
  }

  // ── Registration ──

  registerView(view: IView): Disposable {
    // Tag the view with the plugin ID
    const taggedView = { ...view, pluginId: this._pluginId };
    this._viewRegistry.register(taggedView);

    return this._disposables.add(
      toDisposable(() => {
        this._viewRegistry.unregister(view.id);
      })
    );
  }

  registerCommand(command: ICommand): Disposable {
    this._commands.push(command);
    const registration = this._commandRegistrar(command.id, command.action);

    return this._disposables.add(
      toDisposable(() => {
        registration.dispose();
        const idx = this._commands.indexOf(command);
        if (idx !== -1) this._commands.splice(idx, 1);
      })
    );
  }

  registerContextMenuItem(item: IContextMenuItem): Disposable {
    this._contextMenuItems.push(item);

    return this._disposables.add(
      toDisposable(() => {
        const idx = this._contextMenuItems.indexOf(item);
        if (idx !== -1) this._contextMenuItems.splice(idx, 1);
      })
    );
  }

  registerExporter(exporter: IExporter): Disposable {
    this._exporters.push(exporter);

    return this._disposables.add(
      toDisposable(() => {
        const idx = this._exporters.indexOf(exporter);
        if (idx !== -1) this._exporters.splice(idx, 1);
      }),
    );
  }

  registerToolbarAction(action: IToolbarAction): Disposable {
    this._toolbarActions.push(action);

    return this._disposables.add(
      toDisposable(() => {
        const idx = this._toolbarActions.indexOf(action);
        if (idx !== -1) this._toolbarActions.splice(idx, 1);
      }),
    );
  }

  // ── Webview Communication (Tier 2) ──

  sendToWebview(msg: { type: string; data: unknown }): void {
    this._webviewSender({
      type: `plugin:${this._pluginId}:${msg.type}`,
      data: msg.data,
    });
  }

  onWebviewMessage(handler: (msg: { type: string; data: unknown }) => void): Disposable {
    this._webviewMessageHandlers.add(handler);
    return this._disposables.add(
      toDisposable(() => {
        this._webviewMessageHandlers.delete(handler);
      })
    );
  }

  saveExport(request: ExportRequest): Promise<void> {
    return this._exportSaver(request);
  }

  /**
   * Deliver a message from the webview to this plugin's handlers.
   * Called by the GraphViewProvider when it receives a plugin-targeted message.
   */
  deliverWebviewMessage(msg: { type: string; data: unknown }): void {
    for (const handler of this._webviewMessageHandlers) {
      try {
        handler(msg);
      } catch (e) {
        console.error(`[CodeGraphy] Error in webview message handler for plugin ${this._pluginId}:`, e);
      }
    }
  }

  // ── Utilities ──

  getWorkspaceRoot(): string {
    return this._workspaceRoot;
  }

  log(level: 'info' | 'warn' | 'error', ...args: unknown[]): void {
    this._logFn(level, `[${this._pluginId}]`, ...args);
  }

  // ── Accessors for the host ──

  get pluginId(): string {
    return this._pluginId;
  }

  get commands(): readonly ICommand[] {
    return this._commands;
  }

  get contextMenuItems(): readonly IContextMenuItem[] {
    return this._contextMenuItems;
  }

  get exporters(): readonly IExporter[] {
    return this._exporters;
  }

  get toolbarActions(): readonly IToolbarAction[] {
    return this._toolbarActions;
  }

  /**
   * Dispose all resources registered by this plugin.
   */
  disposeAll(): void {
    this._eventBus.removeAllForPlugin(this._pluginId);
    this._decorationManager.clearDecorations(this._pluginId);
    this._disposables.dispose();
    this._commands.length = 0;
    this._contextMenuItems.length = 0;
    this._exporters.length = 0;
    this._toolbarActions.length = 0;
    this._webviewMessageHandlers.clear();
  }
}
