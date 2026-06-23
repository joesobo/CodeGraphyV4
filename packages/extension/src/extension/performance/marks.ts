import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

export const EXTENSION_PERFORMANCE_LOG_PATH_ENV = 'CODEGRAPHY_EXTENSION_PERFORMANCE_LOG';

export interface ExtensionPerformanceEventDetail {
  readonly [key: string]: unknown;
}

export function recordExtensionPerformanceEvent(
  name: string,
  detail?: ExtensionPerformanceEventDetail,
): void {
  const logPath = process.env[EXTENSION_PERFORMANCE_LOG_PATH_ENV]?.trim();
  if (!logPath) {
    return;
  }

  try {
    mkdirSync(path.dirname(logPath), { recursive: true });
    appendFileSync(logPath, `${JSON.stringify(createExtensionPerformanceEvent(name, detail))}\n`);
  } catch {
    // Performance markers are best-effort harness data and must never affect extension behavior.
  }
}

function createExtensionPerformanceEvent(
  name: string,
  detail?: ExtensionPerformanceEventDetail,
): { name: string; at: number; detail?: ExtensionPerformanceEventDetail } {
  return {
    name,
    at: Date.now(),
    ...(detail === undefined ? {} : { detail }),
  };
}
