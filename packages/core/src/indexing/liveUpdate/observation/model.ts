import { realpath } from 'node:fs/promises';
import path from 'node:path';
import { watch, type FSWatcher } from 'chokidar';
import { resolveWorkspaceRoot } from '../../../workspace/paths';
import { isWorkspaceDiscoveryLifecyclePath } from '../eligibility';
import {
  buildWorkspaceObservationPlan,
  resolveGitPolicyDependencyPaths,
  type WorkspaceObservationPlan,
} from './plan';
import { watchExactPaths, type ExactPathSentinel } from './sentinel';

const SETTINGS_PATH = '.codegraphy/settings.json';
const GIT_POLICY_LIFECYCLE_PATH = '.git/info/exclude';

export interface CodeGraphyWorkspaceFileEvent {
  path: string;
  type: 'create' | 'delete' | 'update';
}

export interface CodeGraphyWorkspaceChangeSubscription {
  dispose(): Promise<void>;
}

export interface SubscribeCodeGraphyWorkspaceChangesOptions {
  workspaceRoot: string;
  onError?: (error: Error) => void;
  onEvents(events: readonly CodeGraphyWorkspaceFileEvent[]): void;
}

interface RawObservationEvent extends CodeGraphyWorkspaceFileEvent {
  directory: boolean;
  workspacePath: string;
}

interface WatchGeneration {
  readonly events: RawObservationEvent[];
  readonly id: number;
  readonly plan: WorkspaceObservationPlan;
  flushTimer?: ReturnType<typeof setTimeout>;
  watcher: FSWatcher;
}

function toEventType(eventName: string): CodeGraphyWorkspaceFileEvent['type'] | undefined {
  if (eventName === 'add' || eventName === 'addDir') return 'create';
  if (eventName === 'change') return 'update';
  if (eventName === 'unlink' || eventName === 'unlinkDir') return 'delete';
  return undefined;
}

function toWorkspacePath(workspaceRoot: string, filePath: string): string {
  return path.relative(workspaceRoot, filePath).split(path.sep).join('/');
}

function coalesceEvents(
  events: readonly CodeGraphyWorkspaceFileEvent[],
): CodeGraphyWorkspaceFileEvent[] {
  const eventsByPath = new Map<string, CodeGraphyWorkspaceFileEvent>();
  for (const event of events) eventsByPath.set(event.path, event);
  return [...eventsByPath.values()];
}

class WorkspaceWatchCoordinator implements CodeGraphyWorkspaceChangeSubscription {
  private current: WatchGeneration | undefined;
  private disposed = false;
  private generationId = 0;
  private initialized = false;
  private readonly lifecycleEvents = new Map<string, CodeGraphyWorkspaceFileEvent>();
  private rebuildPromise: Promise<void> | undefined;
  private rebuildRevision = 0;
  private sentinels: ExactPathSentinel[] = [];
  private readonly logicalRoot: string;
  private readonly physicalRootPromise: Promise<string>;

  private constructor(private readonly options: SubscribeCodeGraphyWorkspaceChangesOptions) {
    this.logicalRoot = resolveWorkspaceRoot(options.workspaceRoot);
    this.physicalRootPromise = realpath(this.logicalRoot);
  }

  static async start(
    options: SubscribeCodeGraphyWorkspaceChangesOptions,
  ): Promise<WorkspaceWatchCoordinator> {
    const coordinator = new WorkspaceWatchCoordinator(options);
    await coordinator.initialize();
    return coordinator;
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    for (const sentinel of this.sentinels) sentinel.dispose();
    this.sentinels = [];
    await this.rebuildPromise;
    const current = this.current;
    this.current = undefined;
    if (current) {
      if (current.flushTimer) clearTimeout(current.flushTimer);
      await current.watcher.close();
    }
  }

  private async initialize(): Promise<void> {
    const physicalRoot = await this.physicalRootPromise;
    this.sentinels = [
      watchExactPaths(
        [path.join(physicalRoot, SETTINGS_PATH)],
        () => this.requestRebuild(this.createLifecycleEvent(SETTINGS_PATH)),
      ),
      watchExactPaths(
        resolveGitPolicyDependencyPaths(physicalRoot),
        () => this.requestRebuild(this.createLifecycleEvent(GIT_POLICY_LIFECYCLE_PATH)),
      ),
    ];
    await this.rebuildUntilStable();
    this.initialized = true;
  }

  private createLifecycleEvent(workspacePath: string): CodeGraphyWorkspaceFileEvent {
    return {
      path: path.join(this.logicalRoot, workspacePath),
      type: 'update',
    };
  }

  private requestRebuild(event: CodeGraphyWorkspaceFileEvent): void {
    if (this.disposed) return;
    this.lifecycleEvents.set(event.path, event);
    this.rebuildRevision += 1;
    if (!this.initialized || this.rebuildPromise) return;
    this.rebuildPromise = this.rebuildUntilStable()
      .catch(error => this.reportError(error))
      .finally(() => {
        this.rebuildPromise = undefined;
        if (this.lifecycleEvents.size > 0 && !this.disposed) {
          this.requestRebuildTask();
        }
      });
  }

  private requestRebuildTask(): void {
    if (this.rebuildPromise || this.disposed) return;
    this.rebuildPromise = this.rebuildUntilStable()
      .catch(error => this.reportError(error))
      .finally(() => {
        this.rebuildPromise = undefined;
      });
  }

  private async rebuildUntilStable(): Promise<void> {
    while (!this.disposed) {
      const revision = this.rebuildRevision;
      const candidate = await this.createGeneration();
      if (this.disposed) {
        await candidate.watcher.close();
        return;
      }
      const invalidatingEvents = candidate.events.filter(event => (
        event.directory || isWorkspaceDiscoveryLifecyclePath(event.workspacePath)
      ));
      if (revision !== this.rebuildRevision || invalidatingEvents.length > 0) {
        for (const event of invalidatingEvents) {
          this.lifecycleEvents.set(event.path, event);
          this.rebuildRevision += 1;
        }
        await candidate.watcher.close();
        continue;
      }

      const previous = this.current;
      this.current = candidate;
      const lifecycleEvents = [...this.lifecycleEvents.values()];
      this.lifecycleEvents.clear();
      const fileChanges = this.createPlanDifferenceEvents(previous?.plan, candidate.plan);
      const bufferedEvents = [...candidate.events];
      candidate.events.length = 0;
      if (previous) {
        if (previous.flushTimer) clearTimeout(previous.flushTimer);
        await previous.watcher.close();
      }
      this.publish([...lifecycleEvents, ...fileChanges]);
      await this.processEvents(candidate, bufferedEvents);
      if (revision === this.rebuildRevision) return;
    }
  }

  private async createGeneration(): Promise<WatchGeneration> {
    const physicalRoot = await this.physicalRootPromise;
    const plan = await buildWorkspaceObservationPlan(physicalRoot);
    const watcher = watch([...plan.directories], {
      depth: 0,
      ignoreInitial: true,
      persistent: true,
    });
    const generation: WatchGeneration = {
      events: [],
      id: ++this.generationId,
      plan,
      watcher,
    };
    watcher.on('all', (eventName, filePath) => {
      const type = toEventType(eventName);
      if (!type || this.disposed) return;
      const workspacePath = toWorkspacePath(physicalRoot, filePath);
      if (!workspacePath || workspacePath.startsWith('../')) return;
      const event: RawObservationEvent = {
        directory: eventName === 'addDir' || eventName === 'unlinkDir',
        path: path.join(this.logicalRoot, workspacePath),
        type,
        workspacePath,
      };
      generation.events.push(event);
      if (this.current?.id === generation.id) this.scheduleEventFlush(generation);
    });
    await new Promise<void>((resolve, reject) => {
      const ready = (): void => {
        watcher.off('error', reject);
        resolve();
      };
      watcher.once('ready', ready);
      watcher.once('error', reject);
    });
    watcher.on('error', error => this.reportError(error));
    return generation;
  }

  private scheduleEventFlush(generation: WatchGeneration): void {
    if (generation.flushTimer || this.disposed) return;
    generation.flushTimer = setTimeout(() => {
      generation.flushTimer = undefined;
      const events = [...generation.events];
      generation.events.length = 0;
      void this.processEvents(generation, events);
    }, 25);
  }

  private async processEvents(
    generation: WatchGeneration,
    events: readonly RawObservationEvent[],
  ): Promise<void> {
    if (this.disposed || this.current?.id !== generation.id) return;
    const rebuildEvents = events.filter(event => (
      event.directory || isWorkspaceDiscoveryLifecyclePath(event.workspacePath)
    ));
    for (const event of rebuildEvents) this.requestRebuild(event);

    const fileEvents = events.filter(event => !event.directory);
    const eligiblePaths = new Set(generation.plan.policy.filterEligiblePaths(
      fileEvents.map(event => event.workspacePath),
    ));
    const eligibleEvents = fileEvents.filter(event => eligiblePaths.has(event.workspacePath));
    for (const event of eligibleEvents) {
      if (event.type === 'delete') generation.plan.files.delete(event.workspacePath);
      else generation.plan.files.add(event.workspacePath);
    }
    this.publish(eligibleEvents.filter(event => (
      !isWorkspaceDiscoveryLifecyclePath(event.workspacePath)
    )));
  }

  private createPlanDifferenceEvents(
    previous: WorkspaceObservationPlan | undefined,
    next: WorkspaceObservationPlan,
  ): CodeGraphyWorkspaceFileEvent[] {
    if (!previous) return [];
    const events: CodeGraphyWorkspaceFileEvent[] = [];
    for (const workspacePath of previous.files) {
      if (!next.files.has(workspacePath)) {
        events.push({
          path: path.join(this.logicalRoot, workspacePath),
          type: 'delete',
        });
      }
    }
    for (const workspacePath of next.files) {
      if (!previous.files.has(workspacePath)) {
        events.push({
          path: path.join(this.logicalRoot, workspacePath),
          type: 'create',
        });
      }
    }
    return events;
  }

  private publish(events: readonly CodeGraphyWorkspaceFileEvent[]): void {
    if (this.disposed || events.length === 0) return;
    this.options.onEvents(coalesceEvents(events));
  }

  private reportError(error: unknown): void {
    this.options.onError?.(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function subscribeCodeGraphyWorkspaceChanges(
  options: SubscribeCodeGraphyWorkspaceChangesOptions,
): Promise<CodeGraphyWorkspaceChangeSubscription> {
  return WorkspaceWatchCoordinator.start(options);
}
