import { describe, expect, it } from 'vitest';
import {
  createVSCodeLaunchArgs,
  selectVSCodeTempBaseDir,
} from './acceptance/graphView/vscode';

describe('createVSCodeLaunchArgs', () => {
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
});
