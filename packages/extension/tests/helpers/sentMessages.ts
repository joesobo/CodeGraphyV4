import type { WebviewToExtensionMessage } from '../../src/shared/types';

/**
 * Typed access to messages captured by the vscodeApi mock.
 * The underlying array is initialized in tests/setup.ts.
 */

interface VscodeSentMessagesGlobal {
  __vscodeSentMessages: WebviewToExtensionMessage[];
}

const globals = globalThis as unknown as VscodeSentMessagesGlobal;

/** Return all captured postMessage calls. */
export function getSentMessages(): WebviewToExtensionMessage[] {
  return globals.__vscodeSentMessages;
}

/** Clear captured messages (call in beforeEach). */
export function clearSentMessages(): void {
  globals.__vscodeSentMessages.length = 0;
}

/** Find the first message matching a given type. */
export function findMessage<T extends WebviewToExtensionMessage['type']>(
  type: T,
): Extract<WebviewToExtensionMessage, { type: T }> | undefined {
  return getSentMessages().find(
    (msg): msg is Extract<WebviewToExtensionMessage, { type: T }> => msg.type === type,
  );
}
