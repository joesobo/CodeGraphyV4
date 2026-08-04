import { describe, expect, it } from 'vitest';
import {
  buildMacOSAppActivationScript,
  createVSCodeLaunchArgs,
  OPEN_GRAPH_VIEW_COMMAND_PALETTE_ATTEMPTS,
  resolveRefocusAppName,
  resolveDownloadedVSCodeExecutablePath,
  selectVSCodeTempBaseDir,
  VSCODE_PLAYWRIGHT_WAIT_TIMEOUT_MS,
} from './acceptance/graphView/vscode';

describe('createVSCodeLaunchArgs', () => {
  it('uses a mock keychain for macOS acceptance test launches', () => {
    const args = createVSCodeLaunchArgs({
      ci: false,
      extensionPath: '/extension',
      extensionsPath: '/tmp/extensions',
      platform: 'darwin',
      userDataPath: '/tmp/user-data',
      workspacePath: '/workspace',
    });

    expect(args).toContain('--use-inmemory-secretstorage');
    expect(args).toContain('--use-mock-keychain');
  });

  it('enables software WebGPU for Linux CI launches', () => {
    const args = createVSCodeLaunchArgs({
      ci: true,
      extensionPath: '/extension',
      extensionsPath: '/tmp/extensions',
      platform: 'linux',
      userDataPath: '/tmp/user-data',
      workspacePath: '/workspace',
    });

    expect(args).toContain('--enable-unsafe-webgpu');
    expect(args).toContain('--enable-unsafe-swiftshader');
  });

  it('uses a short temp base for macOS VS Code IPC sockets', () => {
    expect(selectVSCodeTempBaseDir('darwin', '/var/folders/very/long/T')).toBe('/tmp');
  });

  it('uses the current macOS Code executable when the downloader returns the old Electron name', () => {
    const downloadedPath = '/cache/Visual Studio Code.app/Contents/MacOS/Electron';
    const existingPaths = new Set(['/cache/Visual Studio Code.app/Contents/MacOS/Code']);

    expect(resolveDownloadedVSCodeExecutablePath(
      downloadedPath,
      'darwin',
      candidate => existingPaths.has(candidate),
    )).toBe('/cache/Visual Studio Code.app/Contents/MacOS/Code');
  });

  it('keeps the downloader path on other platforms', () => {
    expect(resolveDownloadedVSCodeExecutablePath('/cache/code', 'linux', () => false)).toBe('/cache/code');
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
