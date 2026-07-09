import type { PerfReport } from '../report';

export interface PerfRunnerMetadataInput {
  arch(): string;
  cpuModels(): readonly string[];
  nodeVersion: string;
  os(): string;
  runnerClass: string;
  vscodeVersion: string;
}

function requireIdentity(value: string | undefined, label: string): string {
  const identity = value?.trim();
  if (!identity) {
    throw new Error(`Performance runner ${label} is required`);
  }
  return identity;
}

export function createPerfRunnerMetadata(
  input: PerfRunnerMetadataInput,
): PerfReport['runner'] {
  return {
    os: requireIdentity(input.os(), 'OS'),
    arch: requireIdentity(input.arch(), 'architecture'),
    cpuModel: requireIdentity(input.cpuModels().find(model => model.trim()), 'CPU model'),
    nodeVersion: requireIdentity(input.nodeVersion, 'Node version'),
    vscodeVersion: requireIdentity(input.vscodeVersion, 'VS Code version'),
    runnerClass: requireIdentity(input.runnerClass, 'class'),
  };
}
