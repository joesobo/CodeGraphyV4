export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: () => string,
): Promise<T> {
  let rejectTimeout: (error: Error) => void = () => {};
  const timeout = new Promise<never>((_resolve, reject) => {
    rejectTimeout = reject;
  });
  const timer = setTimeout(() => rejectTimeout(new Error(message())), timeoutMs);
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
