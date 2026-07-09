import psList from 'ps-list';

export interface ProcessEntry {
  command: string;
  name: string;
  pid: number;
  ppid: number;
}

export interface VsCodeSessionIdentity {
  userDataPath: string;
  workspacePath: string;
}

export interface VsCodeSessionProcesses {
  extensionHostPids: number[];
  rendererPids: number[];
  targetPids: number[];
}

export type ProcessDiscovery = () => Promise<readonly ProcessEntry[]>;

function isSessionLaunchProcess(
  process: ProcessEntry,
  identity: VsCodeSessionIdentity,
): boolean {
  return process.command.includes('--user-data-dir')
    && process.command.includes(identity.userDataPath)
    && process.command.includes(identity.workspacePath);
}

function collectDescendantPids(
  processes: readonly ProcessEntry[],
  rootPids: readonly number[],
): Set<number> {
  const childPidsByParent = new Map<number, number[]>();
  for (const process of processes) {
    const children = childPidsByParent.get(process.ppid) ?? [];
    children.push(process.pid);
    childPidsByParent.set(process.ppid, children);
  }

  const descendants = new Set(rootPids);
  const pending = [...rootPids];
  while (pending.length > 0) {
    const parentPid = pending.shift();
    if (parentPid === undefined) continue;
    for (const childPid of childPidsByParent.get(parentPid) ?? []) {
      if (descendants.has(childPid)) continue;
      descendants.add(childPid);
      pending.push(childPid);
    }
  }
  return descendants;
}

function normalizedDescription(process: ProcessEntry): string {
  return `${process.name} ${process.command}`.toLowerCase();
}

function isRenderer(process: ProcessEntry): boolean {
  return normalizedDescription(process).includes('--type=renderer');
}

function isExtensionHost(process: ProcessEntry): boolean {
  const description = normalizedDescription(process);
  if (
    description.includes('extensionhost')
    || description.includes('extension-host')
    || description.includes('extension_host')
    || description.includes('helper (plugin)')
  ) {
    return true;
  }

  return description.includes('--type=utility')
    && description.includes('node.mojom.nodeservice')
    && (
      description.includes('--inspect-port=0')
      || description.includes('--inspect=')
      || description.includes('--inspect-brk=')
    );
}

function sortedPids(
  processes: readonly ProcessEntry[],
  predicate: (process: ProcessEntry) => boolean,
): number[] {
  return processes
    .filter(predicate)
    .map(process => process.pid)
    .sort((left, right) => left - right);
}

export function discoverVsCodeSessionProcesses(
  processes: readonly ProcessEntry[],
  identity: VsCodeSessionIdentity,
): VsCodeSessionProcesses {
  const launchPids = processes
    .filter(process => isSessionLaunchProcess(process, identity))
    .map(process => process.pid);
  if (launchPids.length === 0) {
    throw new Error(
      `Unable to find VS Code launch process for user data ${identity.userDataPath}`,
    );
  }

  const sessionPids = collectDescendantPids(processes, launchPids);
  const sessionProcesses = processes.filter(process => sessionPids.has(process.pid));
  const rendererPids = sortedPids(sessionProcesses, isRenderer);
  const extensionHostPids = sortedPids(sessionProcesses, isExtensionHost);
  const missingProcessKinds = [
    ...(rendererPids.length === 0 ? ['renderer'] : []),
    ...(extensionHostPids.length === 0 ? ['extension-host'] : []),
  ];
  if (missingProcessKinds.length > 0) {
    throw new Error(
      `Unable to find ${missingProcessKinds.join(' and ')} processes `
        + `for isolated VS Code session ${identity.workspacePath}`,
    );
  }

  return {
    extensionHostPids,
    rendererPids,
    targetPids: [...rendererPids, ...extensionHostPids]
      .sort((left, right) => left - right),
  };
}

export async function listSystemProcesses(): Promise<readonly ProcessEntry[]> {
  return (await psList({ all: true })).map(process => ({
    command: process.cmd ?? '',
    name: process.name,
    pid: process.pid,
    ppid: process.ppid,
  }));
}
