import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import { toDisposable, type Disposable } from '../../../core/plugins/disposable';
import type { IGraphViewContributions } from '../api/contracts/webview';
import {
  mergeGraphViewContributions,
  type GraphViewContributionsByPlugin,
} from './contributions';

export type GraphViewContributionListener = () => void;

export class GraphViewContributionRegistry {
  private readonly _contributions: GraphViewContributionsByPlugin = new Map();
  private readonly _listeners = new Set<GraphViewContributionListener>();
  private _snapshot: CoreGraphViewContributionSet | undefined;

  get(): CoreGraphViewContributionSet {
    if (this._snapshot) {
      return this._snapshot;
    }

    this._snapshot = mergeGraphViewContributions(this._contributions);
    return this._snapshot;
  }

  subscribe(listener: GraphViewContributionListener): Disposable {
    this._listeners.add(listener);
    return toDisposable(() => {
      this._listeners.delete(listener);
    });
  }

  register(pluginId: string, contributions: IGraphViewContributions): Disposable {
    const pluginContributions = this.getOrCreatePluginContributions(pluginId);

    pluginContributions.add(contributions);
    this.invalidate();
    this.notifyListeners();

    return toDisposable(() => {
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
      listener();
    }
  }
}
