import { realpath } from 'node:fs/promises';
import { join } from 'node:path';
import {
  subscribe,
  type AsyncSubscription,
  type Event as ParcelWatcherEvent,
} from '@parcel/watcher';
import { DEFAULT_EXCLUDE } from '../../../discovery/pathExclusions';
import { resolveWorkspaceRoot } from '../../../workspace/paths';
import { filterEligibleWorkspaceEvents, toWorkspacePath } from './eligibility';

const CODEGRAPHY_DIRECTORY = '.codegraphy';
const SETTINGS_PATH = `${CODEGRAPHY_DIRECTORY}/settings.json`;
const WATCH_IGNORE_PATTERNS = DEFAULT_EXCLUDE.filter(
  pattern => pattern !== '**/.codegraphy/**',
);

export type CodeGraphyWorkspaceFileEvent = ParcelWatcherEvent;

export interface CodeGraphyWorkspaceChangeSubscription {
  dispose(): Promise<void>;
}

export interface SubscribeCodeGraphyWorkspaceChangesOptions {
  workspaceRoot: string;
  onError?: (error: Error) => void;
  onEvents(events: readonly CodeGraphyWorkspaceFileEvent[]): void;
}

function isCodeGraphyCacheArtifact(workspaceRoot: string, filePath: string): boolean {
  const workspacePath = toWorkspacePath(workspaceRoot, filePath);
  if (workspacePath === SETTINGS_PATH) return false;
  return workspacePath.split('/').includes(CODEGRAPHY_DIRECTORY);
}

function createSubscription(subscription: AsyncSubscription): CodeGraphyWorkspaceChangeSubscription {
  let disposed = false;
  return {
    async dispose() {
      if (disposed) return;
      disposed = true;
      await subscription.unsubscribe();
    },
  };
}

export async function subscribeCodeGraphyWorkspaceChanges(
  options: SubscribeCodeGraphyWorkspaceChangesOptions,
): Promise<CodeGraphyWorkspaceChangeSubscription> {
  const workspaceRoot = resolveWorkspaceRoot(options.workspaceRoot);
  const watchRoot = await realpath(workspaceRoot);
  const subscription = await subscribe(
    watchRoot,
    (error, events) => {
      if (error) {
        options.onError?.(error);
        return;
      }
      let eligibleEvents = events;
      try {
        eligibleEvents = filterEligibleWorkspaceEvents(watchRoot, events);
      } catch (settingsError) {
        options.onError?.(
          settingsError instanceof Error ? settingsError : new Error(String(settingsError)),
        );
      }
      const sourceEvents = eligibleEvents
        .filter(event => event.path !== watchRoot)
        .filter(event => !isCodeGraphyCacheArtifact(watchRoot, event.path))
        .map(event => ({
          ...event,
          path: join(workspaceRoot, toWorkspacePath(watchRoot, event.path)),
        }));
      if (sourceEvents.length > 0) options.onEvents(sourceEvents);
    },
    { ignore: WATCH_IGNORE_PATTERNS },
  );
  return createSubscription(subscription);
}
