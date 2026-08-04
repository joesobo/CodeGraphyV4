import type {
  CodeGraphyWebviewAPI,
  PluginPanelContribution,
  PluginPanelEscapeEvent,
  PluginPanelHandle,
  PluginSlotRenderCleanup,
  PluginSlotRenderContext,
} from '../api/contracts/webview';
import { toWebviewDisposable, type WebviewDisposable } from '../disposable';

export interface ActivePluginPanel {
  kind: 'plugin';
  contributionId: string;
  pluginId: string;
}

export type PluginPanelEscapeResult = 'none' | 'dismissed' | 'prevented';

interface PluginPanelEntry {
  cleanup: WebviewDisposable | null;
  container: HTMLDivElement;
  contribution: PluginPanelContribution;
  disposed: boolean;
  identity: ActivePluginPanel;
}

function normalizeCleanup(cleanup: PluginSlotRenderCleanup): WebviewDisposable | null {
  if (typeof cleanup === 'function') return toWebviewDisposable(cleanup);
  return cleanup ?? null;
}

function createEscapeEvent(): PluginPanelEscapeEvent {
  let defaultPrevented = false;
  return {
    get defaultPrevented() {
      return defaultPrevented;
    },
    preventDefault() {
      defaultPrevented = true;
    },
  };
}

export class PluginPanelRegistry {
  private activeEntry: PluginPanelEntry | null = null;
  private beforeOpen: () => void = () => undefined;
  private readonly entries = new Map<string, Map<string, PluginPanelEntry>>();
  private host: HTMLDivElement | null = null;
  private readonly listeners = new Set<() => void>();

  attachHost(host: HTMLDivElement): void {
    this.host = host;
    host.setAttribute('data-cg-plugin-panel-host', '');
    if (this.activeEntry) this.mount(this.activeEntry);
    this.syncHostVisibility();
  }

  closeActive(): boolean {
    if (!this.activeEntry) return false;
    const entry = this.activeEntry;
    this.activeEntry = null;
    this.hide(entry);
    this.notify();
    return true;
  }

  detachHost(): void {
    if (this.activeEntry) this.hide(this.activeEntry);
    this.host = null;
  }

  getActive(): ActivePluginPanel | null {
    return this.activeEntry?.identity ?? null;
  }

  handleEscape(): PluginPanelEscapeResult {
    const entry = this.activeEntry;
    if (!entry) return 'none';
    const event = createEscapeEvent();
    entry.contribution.onEscape?.(event);
    if (event.defaultPrevented) return 'prevented';
    this.closeActive();
    return 'dismissed';
  }

  register(
    pluginId: string,
    contribution: PluginPanelContribution,
    api: CodeGraphyWebviewAPI,
  ): PluginPanelHandle {
    const pluginEntries = this.entries.get(pluginId) ?? new Map<string, PluginPanelEntry>();
    if (pluginEntries.has(contribution.id)) {
      throw new Error(`Plugin '${pluginId}' already registered panel '${contribution.id}'.`);
    }

    const container = document.createElement('div');
    container.dataset.cgPlugin = pluginId;
    container.dataset.cgPanelContribution = contribution.id;
    container.dataset.cgPanelOrder = String(contribution.order ?? 0);
    container.style.display = 'none';
    document.body.appendChild(container);
    const entry: PluginPanelEntry = {
      cleanup: null,
      container,
      contribution,
      disposed: false,
      identity: { kind: 'plugin', pluginId, contributionId: contribution.id },
    };

    try {
      const context: PluginSlotRenderContext = { api };
      entry.cleanup = normalizeCleanup(contribution.render(container, context));
    } catch (error) {
      container.remove();
      throw error;
    }

    pluginEntries.set(contribution.id, entry);
    this.entries.set(pluginId, pluginEntries);

    const dispose = (): void => this.disposeEntry(entry);
    return {
      close: () => {
        if (this.activeEntry === entry) this.closeActive();
      },
      dispose,
      isOpen: () => this.activeEntry === entry,
      open: () => this.open(entry),
      toggle: () => {
        if (this.activeEntry === entry) this.closeActive();
        else this.open(entry);
      },
    };
  }

  removePlugin(pluginId: string): void {
    const pluginEntries = this.entries.get(pluginId);
    if (!pluginEntries) return;
    for (const entry of Array.from(pluginEntries.values())) {
      try {
        this.disposeEntry(entry);
      } catch (error) {
        console.error(
          `[CodeGraphy] Failed to clean up panel contribution '${entry.identity.contributionId}' for plugin '${pluginId}':`,
          error,
        );
      }
    }
  }

  setBeforeOpen(listener: () => void): void {
    this.beforeOpen = listener;
  }

  subscribe(listener: () => void): WebviewDisposable {
    this.listeners.add(listener);
    return toWebviewDisposable(() => this.listeners.delete(listener));
  }

  private disposeEntry(entry: PluginPanelEntry): void {
    if (entry.disposed) return;
    entry.disposed = true;
    if (this.activeEntry === entry) this.closeActive();
    const pluginEntries = this.entries.get(entry.identity.pluginId);
    pluginEntries?.delete(entry.identity.contributionId);
    if (pluginEntries?.size === 0) this.entries.delete(entry.identity.pluginId);
    try {
      entry.cleanup?.dispose();
    } finally {
      entry.cleanup = null;
      entry.container.remove();
    }
  }

  private hide(entry: PluginPanelEntry): void {
    entry.container.style.display = 'none';
    document.body.appendChild(entry.container);
    this.syncHostVisibility();
  }

  private mount(entry: PluginPanelEntry): void {
    if (!this.host) return;
    entry.container.style.display = '';
    this.host.appendChild(entry.container);
    this.syncHostVisibility();
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  private open(entry: PluginPanelEntry): void {
    if (entry.disposed || this.activeEntry === entry) return;
    this.beforeOpen();
    if (this.activeEntry) this.hide(this.activeEntry);
    this.activeEntry = entry;
    this.mount(entry);
    this.notify();
  }

  private syncHostVisibility(): void {
    if (this.host) this.host.style.display = this.host.childElementCount > 0 ? '' : 'none';
  }
}
