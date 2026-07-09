import { describe, expect, it } from 'vitest';

import {
  discoverVsCodeSessionProcesses,
  type ProcessEntry,
} from './discovery';

const identity = {
  userDataPath: '/tmp/cgp-session/profile/user-data',
  workspacePath: '/tmp/cgp-session/workspace',
};

function processEntry(
  pid: number,
  ppid: number,
  command: string,
  name = 'Code Helper',
): ProcessEntry {
  return { command, name, pid, ppid };
}

describe('idle CPU process discovery', () => {
  it('finds only renderer and extension-host descendants of the isolated session', () => {
    const processes = [
      processEntry(
        100,
        1,
        `/Applications/Code ${identity.workspacePath} --user-data-dir ${identity.userDataPath}`,
        'Code',
      ),
      processEntry(101, 100, '/Applications/Code Helper --type=renderer'),
      processEntry(
        102,
        100,
        '/Applications/Code Helper --type=utility '
          + '--utility-sub-type=node.mojom.NodeService --inspect-port=0',
        'Code Helper (Plugin)',
      ),
      processEntry(
        200,
        1,
        '/Applications/Code /other/workspace --user-data-dir /other/user-data',
        'Code',
      ),
      processEntry(201, 200, '/Applications/Code Helper --type=renderer'),
      processEntry(
        202,
        200,
        '/Applications/Code Helper --type=utility '
          + '--utility-sub-type=node.mojom.NodeService --inspect-port=0',
        'Code Helper (Plugin)',
      ),
    ];

    expect(discoverVsCodeSessionProcesses(processes, identity)).toEqual({
      extensionHostPids: [102],
      rendererPids: [101],
      targetPids: [101, 102],
    });
  });

  it('follows indirect descendants from the uniquely identified launch process', () => {
    const processes = [
      processEntry(
        100,
        1,
        `/Applications/Code ${identity.workspacePath} --user-data-dir=${identity.userDataPath}`,
        'Code',
      ),
      processEntry(110, 100, '/Applications/Code Helper --type=utility'),
      processEntry(111, 110, '/Applications/Code Helper --type=renderer'),
      processEntry(112, 110, 'node extensionHostProcess.js', 'node'),
    ];

    expect(discoverVsCodeSessionProcesses(processes, identity)).toEqual({
      extensionHostPids: [112],
      rendererPids: [111],
      targetPids: [111, 112],
    });
  });

  it('fails clearly when the isolated session has no complete target process set', () => {
    const processes = [
      processEntry(
        100,
        1,
        `/Applications/Code ${identity.workspacePath} --user-data-dir ${identity.userDataPath}`,
        'Code',
      ),
      processEntry(101, 100, '/Applications/Code Helper --type=renderer'),
    ];

    expect(() => discoverVsCodeSessionProcesses(processes, identity)).toThrow(
      'Unable to find extension-host processes for isolated VS Code session',
    );
  });

  it('fails clearly when no launch process carries the isolated session arguments', () => {
    expect(() => discoverVsCodeSessionProcesses([
      processEntry(200, 1, '/Applications/Code /other/workspace', 'Code'),
    ], identity)).toThrow(
      `Unable to find VS Code launch process for user data ${identity.userDataPath}`,
    );
  });
});
