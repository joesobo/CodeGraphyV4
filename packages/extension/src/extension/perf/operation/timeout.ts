export interface OperationTimeout {
  promise: Promise<never>;
  dispose(): void;
}

export function timeoutAfter(
  operationId: string,
  timeoutMs: number,
  describeWait: () => string = () => 'graph acknowledgement',
): OperationTimeout {
  let rejectTimeout: (error: Error) => void = () => {};
  const promise = new Promise<never>((_resolve, reject) => {
    rejectTimeout = reject;
  });
  const timer = setTimeout(() => {
    rejectTimeout(new Error(
      `Timed out waiting for ${describeWait()} for ${operationId}`,
    ));
  }, timeoutMs);

  return {
    promise,
    dispose(): void {
      clearTimeout(timer);
    },
  };
}
