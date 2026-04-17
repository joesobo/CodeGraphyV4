/**
 * @fileoverview Per-plugin API instance that plugins receive in onLoad().
 * Delegates to EventBus, DecorationManager, ViewRegistry, etc.
 * Tracks all disposables for automatic cleanup on plugin unload.
 */

import { DisposableStore } from '../../disposable';
import { clearPluginDecorations, decoratePluginEdge, decoratePluginNode } from './runtime/decorations';
import { disposePluginApi } from './runtime/dispose';
import type {
  ApiContext,
  CommandRegistrar,
  ExportSaver,
  GraphDataProvider,
  WebviewMessageSender,
} from './runtime/context';
import { offCodeGraphyEvent, onCodeGraphyEvent, onceCodeGraphyEvent } from './runtime/events';
import {
  filterNodeEdgesByKind,
  findNodePath,
  getGraphData,
  getNodeData,
  getNodeEdgesFor,
  getNodeIncomingEdges,
  getNodeNeighbors,
  getNodeOutgoingEdges,
  getNodeSubgraph,
} from './runtime/graph';
import {
  registerPluginCommand,
  registerPluginContextMenuItem,
  registerPluginExporter,
  registerPluginToolbarAction,
  registerPluginView,
} from './runtime/registration';
import {
  getCommands,
  getContextMenuItems,
  getExporters,
  getPluginId,
  getToolbarActions,
  getWorkspaceRoot,
  logPluginMessage,
} from './runtime/access';
import { deliverPluginWebviewMessage, onPluginWebviewMessage, savePluginExport, sendPluginWebviewMessage } from './runtime/webview';
import type { Disposable } from '../../disposable';
import { EventBus, EventPayloads, EventName } from '../../events/bus';
import { DecorationManager, EdgeDecoration, NodeDecoration } from '../../decoration/manager';
import { ViewRegistry } from '../../../views/registry';
import { IView } from '../../../views/contracts';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../../../shared/graph/contracts';
import type { ExportRequest, IExporter, IToolbarAction } from '../../../../../../plugin-api/src/api';
import type { ICommand, IContextMenuItem } from '../../../../../../plugin-api/src/commands';

export class CodeGraphyAPIImpl {
  readonly version = '2.0.0';
  private readonly _context: ApiContext;

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

  on<E extends EventName>(event: E, handler: (payload: EventPayloads[E]) => void): Disposable {
    return this._context.disposables.add(onCodeGraphyEvent(this._context, event, handler));
  }

  once<E extends EventName>(event: E, handler: (payload: EventPayloads[E]) => void): Disposable {
    return this._context.disposables.add(onceCodeGraphyEvent(this._context, event, handler));
  }

  off<E extends EventName>(event: E, handler: (payload: EventPayloads[E]) => void): void {
    offCodeGraphyEvent(this._context, event, handler);
  }

  decorateNode(nodeId: string, decoration: NodeDecoration): Disposable {
    return this._context.disposables.add(decoratePluginNode(this._context, nodeId, decoration));
  }

  decorateEdge(edgeId: string, decoration: EdgeDecoration): Disposable {
    return this._context.disposables.add(decoratePluginEdge(this._context, edgeId, decoration));
  }

  clearDecorations(): void {
    clearPluginDecorations(this._context);
  }

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

  sendToWebview(msg: { type: string; data: unknown }): void {
    sendPluginWebviewMessage(this._context, msg);
  }

  onWebviewMessage(handler: (msg: { type: string; data: unknown }) => void): Disposable {
    return this._context.disposables.add(onPluginWebviewMessage(this._context, handler));
  }

  saveExport(request: ExportRequest): Promise<void> {
    return savePluginExport(this._context, request);
  }

  deliverWebviewMessage(msg: { type: string; data: unknown }): void {
    deliverPluginWebviewMessage(this._context, msg);
  }

  getWorkspaceRoot(): string {
    return getWorkspaceRoot(this._context);
  }

  log(level: 'info' | 'warn' | 'error', ...args: unknown[]): void {
    logPluginMessage(this._context, level, ...args);
  }

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

  disposeAll(): void {
    disposePluginApi(this._context);
  }
}
