import type { Disposable } from '../disposable';
import type { EventName, EventPayloads } from '../events/bus';
import type { EdgeDecoration, NodeDecoration } from '../decoration/manager';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../../shared/graph/contracts';
import type { IView } from '../../views/contracts';

export interface ExportRequest {
  filename: string;
  content: string | Uint8Array;
  filters?: Record<string, string[]>;
  title?: string;
  successMessage?: string;
}

export interface IExporter {
  id: string;
  label: string;
  description?: string;
  group?: string;
  run(this: void): void | Promise<void>;
}

export interface IToolbarActionItem {
  id: string;
  label: string;
  description?: string;
  run(this: void): void | Promise<void>;
}

export interface IToolbarAction {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  items: IToolbarActionItem[];
}

export interface ICommand {
  id: string;
  title: string;
  action(this: void): void | Promise<void>;
}

export interface IContextMenuItem {
  label: string;
  when: 'node' | 'edge' | 'both';
  action(this: void, target: IGraphNode | IGraphEdge): void | Promise<void>;
  icon?: string;
  group?: string;
}

export interface CodeGraphyAPI {
  version: string;

  registerDisposable<T extends Disposable>(disposable: T): T;

  on<E extends EventName>(event: E, handler: (payload: EventPayloads[E]) => void): Disposable;
  once<E extends EventName>(event: E, handler: (payload: EventPayloads[E]) => void): Disposable;
  off<E extends EventName>(event: E, handler: (payload: EventPayloads[E]) => void): void;

  decorateNode(nodeId: string, decoration: NodeDecoration): Disposable;
  decorateEdge(edgeId: string, decoration: EdgeDecoration): Disposable;
  clearDecorations(): void;

  getGraph(): IGraphData;
  getNode(id: string): IGraphNode | null;
  getNeighbors(id: string): IGraphNode[];
  getIncomingEdges(nodeId: string): IGraphEdge[];
  getOutgoingEdges(nodeId: string): IGraphEdge[];
  getEdgesFor(nodeId: string): IGraphEdge[];
  filterEdgesByKind(kind: IGraphEdge['kind'] | IGraphEdge['kind'][]): IGraphEdge[];
  getSubgraph(nodeId: string, hops: number): IGraphData;
  findPath(fromId: string, toId: string): IGraphNode[] | null;

  registerView(view: IView): Disposable;
  registerCommand(command: ICommand): Disposable;
  registerContextMenuItem(item: IContextMenuItem): Disposable;
  registerExporter(exporter: IExporter): Disposable;
  registerToolbarAction(action: IToolbarAction): Disposable;

  sendToWebview(msg: { type: string; data: unknown }): void;
  onWebviewMessage(handler: (msg: { type: string; data: unknown }) => void): Disposable;
  saveExport(request: ExportRequest): Promise<void>;

  getWorkspaceRoot(): string;
  log(level: 'info' | 'warn' | 'error', ...args: unknown[]): void;
}
