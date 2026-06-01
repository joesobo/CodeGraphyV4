import fs from 'node:fs';
import { cleanupVSCode } from './vscode';
import type { GraphAcceptanceContext } from './types';

export async function createGraphViewAcceptanceContext(_input: unknown): Promise<GraphAcceptanceContext> {
  const context: GraphAcceptanceContext = {
    nodeProbes: new Map(),
    cleanup: async () => {
      if (context.vscode) {
        await cleanupVSCode(context.vscode);
      }

      if (context.workspaceTempRoot) {
        fs.rmSync(context.workspaceTempRoot, { recursive: true, force: true });
      }
    },
  };

  return context;
}

export function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}
