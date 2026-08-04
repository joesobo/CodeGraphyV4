import { watch, type FSWatcher } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

interface EntryFingerprint {
  kind: 'directory' | 'file';
  modifiedMs: number;
  size: number;
}

interface DirectoryObservation {
  entries: Map<string, EntryFingerprint>;
  refreshTimer?: ReturnType<typeof setTimeout>;
  watcher: FSWatcher;
}

export interface ShallowFileSystemEvent {
  directory: boolean;
  path: string;
  type: 'create' | 'delete' | 'update';
}

export interface ShallowWatchForestOptions {
  onError(error: Error): void;
  onEvents(events: readonly ShallowFileSystemEvent[]): void;
}

async function readDirectorySnapshot(
  directoryPath: string,
): Promise<Map<string, EntryFingerprint>> {
  const snapshot = new Map<string, EntryFingerprint>();
  let entries;
  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch {
    return snapshot;
  }
  await Promise.all(entries.map(async entry => {
    if (!entry.isDirectory() && !entry.isFile()) return;
    const entryPath = path.join(directoryPath, entry.name);
    try {
      const entryStat = await stat(entryPath);
      snapshot.set(entry.name, {
        kind: entry.isDirectory() ? 'directory' : 'file',
        modifiedMs: entryStat.mtimeMs,
        size: entryStat.size,
      });
    } catch {
      // A later native signal will reconcile entries that changed during this scan.
    }
  }));
  return snapshot;
}

function snapshotsEqual(left: EntryFingerprint, right: EntryFingerprint): boolean {
  return left.kind === right.kind
    && left.modifiedMs === right.modifiedMs
    && left.size === right.size;
}

function createSnapshotEvents(
  directoryPath: string,
  previous: ReadonlyMap<string, EntryFingerprint>,
  current: ReadonlyMap<string, EntryFingerprint>,
): ShallowFileSystemEvent[] {
  const events: ShallowFileSystemEvent[] = [];
  for (const [name, fingerprint] of previous) {
    if (!current.has(name)) {
      events.push({
        directory: fingerprint.kind === 'directory',
        path: path.join(directoryPath, name),
        type: 'delete',
      });
    }
  }
  for (const [name, fingerprint] of current) {
    const priorFingerprint = previous.get(name);
    if (!priorFingerprint) {
      events.push({
        directory: fingerprint.kind === 'directory',
        path: path.join(directoryPath, name),
        type: 'create',
      });
    } else if (!snapshotsEqual(priorFingerprint, fingerprint)) {
      events.push({
        directory: fingerprint.kind === 'directory',
        path: path.join(directoryPath, name),
        type: 'update',
      });
    }
  }
  return events;
}

export class ShallowWatchForest {
  private readonly observations = new Map<string, DirectoryObservation>();
  private stopped = false;

  private constructor(private readonly options: ShallowWatchForestOptions) {}

  static async start(
    directories: readonly string[],
    options: ShallowWatchForestOptions,
  ): Promise<ShallowWatchForest> {
    const forest = new ShallowWatchForest(options);
    try {
      for (const directoryPath of directories) await forest.attach(directoryPath);
      return forest;
    } catch (error) {
      await forest.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    for (const observation of this.observations.values()) {
      if (observation.refreshTimer) clearTimeout(observation.refreshTimer);
      observation.watcher.close();
    }
    this.observations.clear();
  }

  private async attach(directoryPath: string): Promise<void> {
    if (this.stopped || this.observations.has(directoryPath)) return;
    let dirtyDuringSnapshot = false;
    const watcher = watch(directoryPath, { recursive: false }, () => {
      const observation = this.observations.get(directoryPath);
      if (!observation) {
        dirtyDuringSnapshot = true;
        return;
      }
      this.scheduleRefresh(directoryPath, observation);
    });
    watcher.on('error', error => this.options.onError(error));
    const observation: DirectoryObservation = {
      entries: await readDirectorySnapshot(directoryPath),
      watcher,
    };
    if (this.stopped) {
      watcher.close();
      return;
    }
    this.observations.set(directoryPath, observation);
    if (dirtyDuringSnapshot) this.scheduleRefresh(directoryPath, observation);
  }

  private scheduleRefresh(
    directoryPath: string,
    observation: DirectoryObservation,
  ): void {
    if (this.stopped || observation.refreshTimer) return;
    observation.refreshTimer = setTimeout(() => {
      observation.refreshTimer = undefined;
      void this.refresh(directoryPath, observation);
    }, 10);
  }

  private async refresh(
    directoryPath: string,
    observation: DirectoryObservation,
  ): Promise<void> {
    const current = await readDirectorySnapshot(directoryPath);
    if (this.stopped || this.observations.get(directoryPath) !== observation) return;
    const events = createSnapshotEvents(directoryPath, observation.entries, current);
    observation.entries = current;
    if (events.length > 0) this.options.onEvents(events);
  }
}
