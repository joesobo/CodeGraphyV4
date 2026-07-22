import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach } from 'vitest';
import { createDefaultCodeGraphyRepoSettings } from '../../../../src/extension/repoSettings/defaults';

const tempDirectories: string[] = [];

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

export function createTempWorkspace(): string {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-settings-'));
  tempDirectories.push(workspaceRoot);
  return workspaceRoot;
}

export function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function readExtensionInterfaceData(
  settings: Record<string, unknown>,
): Record<string, unknown> {
  const interfaces = settings.interfaces as Array<{ id: string; data: Record<string, unknown> }>;
  return interfaces.find(entry => entry.id === 'codegraphy.extension')?.data ?? {};
}

export function createSettingsWithOverrides(
  overrides: Partial<ReturnType<typeof createDefaultCodeGraphyRepoSettings>>,
): ReturnType<typeof createDefaultCodeGraphyRepoSettings> {
  return { ...createDefaultCodeGraphyRepoSettings(), ...overrides };
}
