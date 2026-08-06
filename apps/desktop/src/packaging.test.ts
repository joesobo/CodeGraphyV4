import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

interface TauriConfiguration {
  app?: { security?: { csp?: string } };
  bundle?: { resources?: unknown };
}

async function readTauriConfiguration(): Promise<TauriConfiguration> {
  return JSON.parse(await readFile('src-tauri/tauri.conf.json', 'utf8')) as TauriConfiguration;
}

describe('desktop packaging contracts', () => {
  it('allows the webview to fetch its own renderer WASM asset', async () => {
    const configuration = await readTauriConfiguration();
    expect(configuration.app?.security?.csp).toContain("connect-src 'self'");
  });

  it('preserves the deployed Core runtime hierarchy', async () => {
    const configuration = await readTauriConfiguration();
    expect(configuration.bundle?.resources).toEqual(['runtime/']);
  });
});
