import type { EventBus } from '../../../../events/bus';
import type { DecorationManager } from '../../../../decoration/manager';
import type { ViewRegistry } from '../../../../../views/registry';
import type { IGraphData } from '../../../../../../shared/graph/contracts';
import type { ExportRequest, IExporter, IToolbarAction } from '../../../../../../../../plugin-api/src/api';
import type { ICommand, IContextMenuItem } from '../../../../../../../../plugin-api/src/commands';
import type { DisposableStore } from '../../../../disposable';

export type GraphDataProvider = () => IGraphData;
export type CommandRegistrar = (id: string, action: () => void | Promise<void>) => { dispose(): void };
export type WebviewMessageSender = (msg: { type: string; data: unknown }) => void;
export type ExportSaver = (request: ExportRequest) => Promise<void>;

export interface ApiContext {
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
