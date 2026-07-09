export interface ExplorerMeasurementDisposable {
  dispose(): void;
}

export interface ExplorerMeasurementClock {
  now: () => number;
  waitForWorkbenchDispatchTurn: () => Promise<void>;
}

export interface ExplorerWorkspaceEventMeasurement<Event> {
  label: 'rename' | 'create' | 'delete';
  subscribe: (listener: (event: Event) => void) => ExplorerMeasurementDisposable;
  matches: (event: Event) => boolean;
  apply: () => Promise<boolean>;
  timeoutMs?: number;
}

interface PendingExplorerEvent {
  promise: Promise<void>;
  dispose(): void;
}

const defaultTimeoutMs = 30_000;

function waitForMatchingExplorerEvent<Event>(
  input: ExplorerWorkspaceEventMeasurement<Event>,
): PendingExplorerEvent {
  let timer: ReturnType<typeof setTimeout>;
  let subscription: ExplorerMeasurementDisposable;
  const promise = new Promise<void>((resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for Explorer ${input.label} workspace event`));
    }, input.timeoutMs ?? defaultTimeoutMs);
    subscription = input.subscribe((event) => {
      if (input.matches(event)) resolve();
    });
  });

  return {
    promise,
    dispose(): void {
      clearTimeout(timer);
      subscription.dispose();
    },
  };
}

/**
 * Times workspace.applyEdit start through the matching onDid*Files event and
 * one workbench dispatch turn. VS Code exposes no public Explorer DOM-paint
 * completion event, so this deliberately reports observable workspace latency,
 * not claimed pixel-paint latency.
 */
export async function measureExplorerWorkspaceEventLatency<Event>(
  input: ExplorerWorkspaceEventMeasurement<Event>,
  clock: ExplorerMeasurementClock,
): Promise<number> {
  const observed = waitForMatchingExplorerEvent(input);
  const startedAt = clock.now();

  try {
    await Promise.all([
      (async () => {
        if (!await input.apply()) {
          throw new Error(`VS Code did not apply Explorer ${input.label} workspace edit`);
        }
      })(),
      observed.promise,
    ]);
    await clock.waitForWorkbenchDispatchTurn();
    return Math.max(0, clock.now() - startedAt);
  } finally {
    observed.dispose();
  }
}
