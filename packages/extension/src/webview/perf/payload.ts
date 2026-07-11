import type { PerfEventInput } from '../../shared/perf/protocol';
import { webviewPerfBridge } from './bridge';

interface PayloadPerfBridge {
  emit(event: PerfEventInput): boolean;
  isArmed(): boolean;
}

type Serialize = (value: unknown) => string | undefined;

export function emitGraphPayloadBytes(
  payload: unknown,
  bridge: PayloadPerfBridge = webviewPerfBridge,
  serialize: Serialize = JSON.stringify,
): boolean {
  if (!bridge.isArmed()) {
    return false;
  }

  try {
    const json = serialize(payload);
    if (json === undefined) {
      return false;
    }

    return bridge.emit({
      kind: 'metric',
      metric: 'payloadBytes',
      unit: 'bytes',
      value: new TextEncoder().encode(json).byteLength,
    });
  } catch {
    return false;
  }
}
