import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';
import type { IGraphViewContributions } from '../api/contracts/webview';
import { toWebviewDisposable, type WebviewDisposable } from '../disposable';
import {
  mergeGraphViewContributions,
  type GraphViewContributionsByPlugin,
} from './contributions';

export type GraphViewContributionListener = () => void;

export class GraphViewContributionRegistry {
  private readonly _contributions: GraphViewContributionsByPlugin = new Map();
  private readonly _listeners = new Set<GraphViewContributionListener>();
  private _snapshot: ExtensionGraphViewContributionSet | undefined;

  get(): ExtensionGraphViewContributionSet {
    if (this._snapshot) {
      return this._snapshot;
    }

    this._snapshot = mergeGraphViewContributions(this._contributions);
    return this._snapshot;
  }

  subscribe(listener: GraphViewContributionListener): WebviewDisposable {
    this._listeners.add(listener);
    return toWebviewDisposable(() => {
      this._listeners.delete(listener);
    });
  }

  register(pluginId: string, contributions: IGraphViewContributions): WebviewDisposable {
    const pluginContributions = this.getOrCreatePluginContributions(pluginId);

    pluginContributions.add(contributions);
    this.invalidate();
    this.notifyListeners();

    return toWebviewDisposable(() => {
      const currentContributions = this._contributions.get(pluginId);
      currentContributions?.delete(contributions);
      if (currentContributions?.size === 0) {
        this._contributions.delete(pluginId);
      }
      this.invalidate();
      this.notifyListeners();
    });
  }

  removePlugin(pluginId: string): void {
    if (this._contributions.delete(pluginId)) {
      this.invalidate();
      this.notifyListeners();
    }
  }

  private getOrCreatePluginContributions(pluginId: string): Set<IGraphViewContributions> {
    let pluginContributions = this._contributions.get(pluginId);
    if (!pluginContributions) {
      pluginContributions = new Set();
      this._contributions.set(pluginId, pluginContributions);
    }

    return pluginContributions;
  }

  private invalidate(): void {
    this._snapshot = undefined;
  }

  private notifyListeners(): void {
    for (const listener of this._listeners) {
      try {
        listener();
      } catch (error) {
        console.error('[CodeGraphy] Graph View contribution listener failed:', error);
      }
    }
  }
}
