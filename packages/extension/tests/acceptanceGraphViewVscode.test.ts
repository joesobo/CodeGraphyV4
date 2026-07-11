import { describe, expect, it } from 'vitest';
import {
  buildMacOSAppActivationScript,
  createVSCodeLaunchArgs,
  createVSCodeRecordVideo,
  OPEN_GRAPH_VIEW_COMMAND_PALETTE_ATTEMPTS,
  resolveRefocusAppName,
  selectVSCodeTempBaseDir,
  VSCODE_PLAYWRIGHT_WAIT_TIMEOUT_MS,
} from './acceptance/graphView/vscode';

describe('createVSCodeLaunchArgs', () => {
  it('enables Electron video capture only when a directory is requested', () => {
    expect(createVSCodeRecordVideo(undefined)).toBeUndefined();
    expect(createVSCodeRecordVideo('/tmp/showcase')).toEqual({
      dir: '/tmp/showcase',
      size: { width: 1280, height: 720 },
    });
  });

  it('uses a mock keychain for macOS acceptance test launches', () => {
    const args = createVSCodeLaunchArgs({
      extensionPath: '/extension',
      extensionsPath: '/tmp/extensions',
      platform: 'darwin',
      userDataPath: '/tmp/user-data',
      workspacePath: '/workspace',
    });

    expect(args).toContain('--use-inmemory-secretstorage');
    expect(args).toContain('--use-mock-keychain');
  });

  it('uses a short temp base for macOS VS Code IPC sockets', () => {
    expect(selectVSCodeTempBaseDir('darwin', '/var/folders/very/long/T')).toBe('/tmp');
  });

  it('allows twenty seconds for VS Code Playwright readiness waits', () => {
    expect(VSCODE_PLAYWRIGHT_WAIT_TIMEOUT_MS).toBe(20_000);
  });

  it('retries opening the graph view through the command palette', () => {
    expect(OPEN_GRAPH_VIEW_COMMAND_PALETTE_ATTEMPTS).toBe(3);
  });

  it('builds a quoted macOS app activation script', () => {
    expect(buildMacOSAppActivationScript('Codex')).toBe('tell application "Codex" to activate');
  });

  it('only refocuses when the local macOS app name is configured', () => {
    expect(resolveRefocusAppName({
      appName: 'Codex',
      platform: 'darwin',
    })).toBe('Codex');
    expect(resolveRefocusAppName({
      appName: 'Codex',
      platform: 'linux',
    })).toBeUndefined();
    expect(resolveRefocusAppName({
      appName: '',
      platform: 'darwin',
    })).toBeUndefined();
  });
});
