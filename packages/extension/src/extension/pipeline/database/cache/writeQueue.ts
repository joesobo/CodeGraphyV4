type WorkspaceCacheWriteKind = 'clear' | 'full' | 'patch';

interface WorkspaceCacheWriteWaiter {
  reject(error: unknown): void;
  resolve(): void;
}

interface WorkspaceCacheWriteOperation {
  execute(): Promise<void>;
  kind: WorkspaceCacheWriteKind;
  waiters: WorkspaceCacheWriteWaiter[];
}

interface WorkspaceCacheWriteQueue {
  operations: WorkspaceCacheWriteOperation[];
  running: boolean;
}

const queues = new Map<string, WorkspaceCacheWriteQueue>();

function runQueue(workspaceRoot: string, queue: WorkspaceCacheWriteQueue): void {
  if (queue.running) {
    return;
  }
  const operation = queue.operations.shift();
  if (!operation) {
    queues.delete(workspaceRoot);
    return;
  }

  queue.running = true;
  void operation.execute()
    .then(() => {
      for (const waiter of operation.waiters) {
        waiter.resolve();
      }
    }, (error: unknown) => {
      for (const waiter of operation.waiters) {
        waiter.reject(error);
      }
    })
    .finally(() => {
      queue.running = false;
      runQueue(workspaceRoot, queue);
    });
}

export function enqueueWorkspaceCacheWrite(
  workspaceRoot: string,
  kind: WorkspaceCacheWriteKind,
  execute: () => Promise<void>,
): Promise<void> {
  let queue = queues.get(workspaceRoot);
  if (!queue) {
    queue = { operations: [], running: false };
    queues.set(workspaceRoot, queue);
  }

  return new Promise<void>((resolve, reject) => {
    const waiter = { resolve, reject };
    const pendingOperation = queue.operations.at(-1);
    if (kind === 'full' && pendingOperation?.kind === 'full') {
      pendingOperation.execute = execute;
      pendingOperation.waiters.push(waiter);
    } else {
      queue.operations.push({ execute, kind, waiters: [waiter] });
    }
    runQueue(workspaceRoot, queue);
  });
}
